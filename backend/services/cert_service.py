import os
from pathlib import Path
from datetime import datetime

from core.config import get_settings
from core.logger import logger

settings = get_settings()


async def generate_certificate(
    employee_email: str, track_name: str, serial: str
) -> str:
    """Generate a PDF certificate and return its URL path."""
    try:
        from reportlab.lib.pagesizes import landscape, A4
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle

        cert_dir = Path(settings.CERT_STORAGE_PATH)
        cert_dir.mkdir(parents=True, exist_ok=True)

        filename = f"cert_{serial}.pdf"
        filepath = cert_dir / filename

        doc = SimpleDocTemplate(str(filepath), pagesize=landscape(A4))
        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "title",
            fontSize=36,
            leading=48,
            alignment=1,
            textColor=colors.HexColor("#1a1a2e"),
            fontName="Helvetica-Bold",
        )
        sub_style = ParagraphStyle(
            "sub",
            fontSize=18,
            leading=28,
            alignment=1,
            textColor=colors.HexColor("#16213e"),
        )
        body_style = ParagraphStyle(
            "body",
            fontSize=14,
            leading=22,
            alignment=1,
            textColor=colors.HexColor("#0f3460"),
        )
        small_style = ParagraphStyle(
            "small", fontSize=10, alignment=1, textColor=colors.grey
        )

        content = [
            Spacer(1, 0.5 * inch),
            Paragraph("🏆 CERTIFICATE OF COMPLETION", title_style),
            Spacer(1, 0.3 * inch),
            HRFlowable(width="80%", thickness=2, color=colors.HexColor("#e94560")),
            Spacer(1, 0.3 * inch),
            Paragraph("This certifies that", sub_style),
            Spacer(1, 0.2 * inch),
            Paragraph(
                f"<b>{employee_email}</b>",
                ParagraphStyle(
                    "name",
                    fontSize=24,
                    leading=32,
                    alignment=1,
                    textColor=colors.HexColor("#e94560"),
                    fontName="Helvetica-Bold",
                ),
            ),
            Spacer(1, 0.2 * inch),
            Paragraph(f"has successfully completed the", body_style),
            Paragraph(f"<b>{track_name}</b>", sub_style),
            Paragraph(f"learning track in Utiliko.", body_style),
            Spacer(1, 0.3 * inch),
            HRFlowable(width="60%", thickness=1, color=colors.HexColor("#16213e")),
            Spacer(1, 0.2 * inch),
            Paragraph(
                f"Issued: {datetime.utcnow().strftime('%B %d, %Y')}", small_style
            ),
            Paragraph(f"Certificate Serial: {serial}", small_style),
        ]

        doc.build(content)
        logger.info("certificate_generated", filepath=str(filepath), serial=serial)
        return f"/static/certificates/{filename}"

    except ImportError:
        logger.warning("reportlab_not_installed", fallback="returning placeholder URL")
        return f"/static/certificates/cert_{serial}.pdf"
    except Exception as e:
        logger.error("certificate_generation_failed", error=str(e))
        return f"/static/certificates/cert_{serial}.pdf"
