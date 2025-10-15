from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch
import sys
from datetime import datetime

def generate_task_completion_report(filename="task_completion_report.pdf"):
    # Mock data
    tasks = [
        {"Task Name": "Design Homepage Mockup", "Project Name": "Website Redesign", "Owner of Task": "Alice Chen", "Owner of Project": "Bob Smith"},
        {"Task Name": "Develop Login API", "Project Name": "Mobile App Launch", "Owner of Task": "Bob Smith", "Owner of Project": "Bob Smith"},
        {"Task Name": "Write Blog Post: Q2 Results", "Project Name": "Content Marketing", "Owner of Task": "Eva Garcia", "Owner of Project": "Frank Lee"},
        {"Task Name": "Competitor Analysis Report", "Project Name": "Market Research", "Owner of Task": "Frank Lee", "Owner of Project": "Alice Chen"},
        {"Task Name": "Fix SSL Certificate Error", "Project Name": "Infrastructure Maintenance", "Owner of Task": "David Wilson", "Owner of Project": "David Wilson"},
        {"Task Name": "Plan Q3 Team Offsite", "Project Name": "Internal Operations", "Owner of Task": "Grace Kim", "Owner of Project": "Grace Kim"},
        {"Task Name": "User Testing: Beta Feature", "Project Name": "Mobile App Launch", "Owner of Task": "Bob Smith", "Owner of Project": "Bob Smith"},
        {"Task Name": "Update Employee Handbook", "Project Name": "Internal Operations", "Owner of Task": "Grace Kim", "Owner of Project": "Grace Kim"},
        {"Task Name": "Create Social Media Assets", "Project Name": "Product Launch Campaign", "Owner of Task": "Helen Taylor", "Owner of Project": "Charlie Brown"},
        {"Task Name": "Migrate Database to Cloud", "Project Name": "Infrastructure Maintenance", "Owner of Task": "David Wilson", "Owner of Project": "David Wilson"}
    ]

    # Create PDF document
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch,
        title="Task Completion Report",
        author="Little Farms System"
    )

    elements = []
    styles = getSampleStyleSheet()

    # Title
    title_style = ParagraphStyle(
        'MainTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=20,
        textColor=colors.HexColor('#2C3E50'),
        alignment=1  # Center
    )
    elements.append(Paragraph("Task Completion Report", title_style))

    # Subtitle
    subtitle_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=30,
        textColor=colors.HexColor('#7F8C8D'),
        alignment=1
    )
    reportType = "User"
    elements.append(Paragraph("Completion Report for " + reportType, subtitle_style))

    # Define wrapped text helper
    def create_wrapped_text(text, style_name='Normal'):
        style = ParagraphStyle(
            style_name,
            parent=styles['Normal'],
            fontSize=9,
            leading=11,  # line spacing
            alignment=1,  # Center align text
            wordWrap='CJK'  # Ensures proper wrapping
        )
        return Paragraph(str(text), style)

    # Table data
    task_data = [["Task Name", "Project Name", "Owner of Task", "Owner of Project"]]

    # Add rows with wrapped text
    for task in tasks:
        task_data.append([
            create_wrapped_text(task["Task Name"]),
            create_wrapped_text(task["Project Name"]),
            create_wrapped_text(task["Owner of Task"]),
            create_wrapped_text(task["Owner of Project"])
        ])

    # Column widths
    col_widths = [1.8*inch, 1.6*inch, 1.3*inch, 1.3*inch, 1.2*inch, 0.8*inch]

    # Create table
    task_table = Table(task_data, colWidths=col_widths, repeatRows=1)

    # Table styling
    task_table.setStyle(TableStyle([
        # Header
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495E')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),

        # Cells
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 1), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#BDC3C7')),

        # Alternate row colors
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8F9F9')]),
    ]))

    elements.append(task_table)
    elements.append(Spacer(1, 0.4*inch))

    # Footer
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#7F8C8D'),
        alignment=1
    )
    elements.append(Paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d at %H:%M')} | Task Completion View", footer_style))

    doc.build(elements)
    return True


if __name__ == "__main__":
    try:
        filename = sys.argv[1] if len(sys.argv) > 1 else "task_completion_report.pdf"
        success = generate_task_completion_report(filename)
        sys.exit(0 if success else 1)
    except Exception as e:
        print(f"Error generating task completion report: {str(e)}", file=sys.stderr)
        sys.exit(1)
