from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch
import sys
import json
from datetime import datetime

def generate_task_completion_report(tasks_data, filename="task_completion_report.pdf", report_type="User", timeFrame ="Undefined"):

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
    elements.append(Paragraph("Completion Report for " + report_type + " for the duration of " + timeFrame, subtitle_style))

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
    task_data = [["Task Name", "Owner of Task", "Project Name", "Owner of Project", "Completion date"]]

    # Add rows with wrapped text
    for task in tasks_data:
        task_data.append([
            create_wrapped_text(task["Task Name"]),
            create_wrapped_text(task["Owner of Task"]),
            create_wrapped_text(task["Project Name"]),
            create_wrapped_text(task["Owner of Project"]),
            create_wrapped_text(task["Completion date"])
        ])

    # Column widths
    col_widths = [1.8*inch, 1.6*inch, 1.3*inch, 1.3*inch]

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

def main():
    try:
        # Read data from stdin
        input_data = sys.stdin.read()
        
        if not input_data:
            print("Error: No input data provided", file=sys.stderr)
            sys.exit(1)
            
        # Parse JSON data
        config = json.loads(input_data)
        
        tasks = config.get('tasks', [])
        filename = config.get('filename', 'task_completion_report.pdf')
        report_type = config.get('report_type', 'User')
        timeFrame = config.get('timeFrame', 'Undefined')
        
        if not tasks:
            print("Error: No tasks data provided", file=sys.stderr)
            sys.exit(1)
            
        success = generate_task_completion_report(tasks, filename, report_type, timeFrame)
        sys.exit(0 if success else 1)
        
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON input: {str(e)}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error generating task completion report: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()