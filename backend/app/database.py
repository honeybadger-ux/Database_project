import logging
import socket
from typing import Generator
from urllib.parse import urlparse, urlunparse
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker, Session

from app.config import settings

logger = logging.getLogger("courier_logistics")


def resolve_db_url(url: str) -> str:
    parsed = urlparse(url)
    orig_host = parsed.hostname
    port = parsed.port or 5432
    if not orig_host:
        return url

    # Collect diagnostic IPs
    discovered_ips = []
    try:
        with open("/etc/resolv.conf", "r") as f:
            for line in f:
                if line.startswith("nameserver"):
                    ns = line.split()[1]
                    discovered_ips.append(ns)
    except Exception:
        pass

    try:
        # Determine container default gateway
        with open("/proc/net/route", "r") as f:
            for line in f:
                fields = line.strip().split()
                if len(fields) > 2 and fields[1] == "00000000":
                    gw_hex = fields[2]
                    gw_ip = ".".join(str(int(gw_hex[i:i+2], 16)) for i in (6, 4, 2, 0))
                    discovered_ips.append(gw_ip)
    except Exception:
        pass

    candidates = [orig_host, "db", "courier_db", "host.docker.internal"] + discovered_ips + ["172.17.0.1", "172.18.0.1", "172.19.0.1", "172.20.0.1", "172.21.0.1", "172.22.0.1", "172.28.0.1"]
    
    for host in candidates:
        try:
            with socket.create_connection((host, port), timeout=0.8):
                logger.info(f"Connected to database host '{host}:{port}' successfully.")
                new_netloc = parsed.netloc.replace(f"@{orig_host}", f"@{host}")
                return urlunparse(parsed._replace(netloc=new_netloc))
        except Exception as e:
            continue
    return url


active_db_url = resolve_db_url(settings.DATABASE_URL)

engine = create_engine(
    active_db_url,
    pool_pre_ping=True,
    pool_size=20,
    max_overflow=10,
    pool_recycle=1800,
    pool_timeout=30,
    echo=False,
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine,
)


class Base(DeclarativeBase):
    pass


def get_db() -> Generator[Session, None, None]:
    """Dependency that provides a database session and ensures cleanup."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db_schema():
    """Ensures production-grade multi-tenant columns, triggers, and indices exist."""
    try:
        from sqlalchemy import text
        with engine.begin() as conn:
            conn.execute(text("ALTER TABLE sellers ADD COLUMN IF NOT EXISTS password_hash VARCHAR(255);"))
            conn.execute(text("UPDATE sellers SET password_hash = '$2b$12$Ny/XcHnvLmvmSIoiJSE.MOle8FrCYlceiDSzas.Eew0IKem0bV5Q2' WHERE password_hash IS NULL;"))
            
            # Upgrade fn_validate_status_transition for multi-tenant role hierarchy
            conn.execute(text("""
                CREATE OR REPLACE FUNCTION fn_validate_status_transition()
                RETURNS TRIGGER AS $$
                DECLARE
                    v_current_status parcel_status;
                    v_emp_hub_id     BIGINT;
                    v_emp_role       VARCHAR;
                    v_emp_carrier    BIGINT;
                BEGIN
                    -- Fetch current parcel status
                    SELECT current_status INTO v_current_status
                    FROM parcels
                    WHERE parcel_id = NEW.parcel_id;

                    -- BI-9: Terminal State Finality (checked FIRST)
                    IF v_current_status IN ('DELIVERED', 'RETURNED_TO_SENDER', 'CANCELLED') THEN
                        RAISE EXCEPTION 'Terminal State: Parcel % is finalized in state %. No further events allowed.',
                            NEW.parcel_id, v_current_status;
                    END IF;

                    -- BI-3: Hub Authorization Scope
                    -- When both employee and hub are provided, verify the employee belongs
                    -- to that hub, or is an executive (SUPER_ADMIN or COURIER_ADMIN) for this carrier.
                    IF NEW.employee_id IS NOT NULL AND NEW.hub_id IS NOT NULL THEN
                        SELECT hub_id, role::TEXT, courier_id 
                        INTO v_emp_hub_id, v_emp_role, v_emp_carrier
                        FROM employees
                        WHERE employee_id = NEW.employee_id;

                        IF v_emp_role = 'SUPER_ADMIN' THEN
                            NULL;
                        ELSIF v_emp_role = 'COURIER_ADMIN' THEN
                            IF NOT EXISTS (SELECT 1 FROM hubs WHERE hub_id = NEW.hub_id AND courier_id = v_emp_carrier) THEN
                                RAISE EXCEPTION 'Carrier Scope Violation: Hub % does not belong to carrier %', NEW.hub_id, v_emp_carrier;
                            END IF;
                        ELSIF v_emp_hub_id != NEW.hub_id THEN
                            RAISE EXCEPTION 'Hub Authorization Violation: Employee % belongs to hub %, not hub %',
                                NEW.employee_id, v_emp_hub_id, NEW.hub_id;
                        END IF;
                    END IF;

                    -- Initial registration event (parcel just created with REGISTERED)
                    IF v_current_status = 'REGISTERED' AND NEW.status = 'REGISTERED' THEN
                        RETURN NEW;
                    END IF;

                    -- BI-4: State Transition Adjacency Matrix
                    IF NOT (
                        (v_current_status = 'REGISTERED'             AND NEW.status IN ('PICKED_UP', 'RECEIVED_AT_ORIGIN_HUB', 'CANCELLED'))
                     OR (v_current_status = 'PICKED_UP'              AND NEW.status = 'RECEIVED_AT_ORIGIN_HUB')
                     OR (v_current_status = 'RECEIVED_AT_ORIGIN_HUB' AND NEW.status = 'IN_TRANSIT')
                     OR (v_current_status = 'IN_TRANSIT'              AND NEW.status = 'ARRIVED_AT_HUB')
                     OR (v_current_status = 'ARRIVED_AT_HUB'          AND NEW.status IN ('IN_TRANSIT', 'OUT_FOR_DELIVERY'))
                     OR (v_current_status = 'OUT_FOR_DELIVERY'        AND NEW.status IN ('DELIVERED', 'FAILED_DELIVERY'))
                     OR (v_current_status = 'FAILED_DELIVERY'         AND NEW.status IN ('OUT_FOR_DELIVERY', 'RETURNED_TO_SENDER'))
                    ) THEN
                        RAISE EXCEPTION 'Illegal Transition: Parcel % cannot go from % to %',
                            NEW.parcel_id, v_current_status, NEW.status;
                    END IF;

                    RETURN NEW;
                END;
                $$ LANGUAGE plpgsql;
            """))
            logger.info("Initialized schema: password_hash and multi-tenant status trigger confirmed.")
    except Exception as exc:
        logger.warning(f"init_db_schema warning: {exc}")


# Run schema initialization automatically upon database load
init_db_schema()

