from reportlab.pdfgen import canvas
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.units import inch
from reportMappers import REPORT_MAPPERS
import sys
import json
from datetime import datetime

def generate_task_completion_report(tasks_data, filename="task_completion_report.pdf", report_type="user", timeFrame="Undefined", filter_type="undefined"):
    # Your existing task completion report code here
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
        alignment=1
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

    def create_wrapped_text(text, style_name='Normal'):
        style = ParagraphStyle(
            style_name,
            parent=styles['Normal'],
            fontSize=9,
            leading=11,
            alignment=1,
            wordWrap='CJK'
        )
        return Paragraph(str(text), style)

    if filter_type == "user":
        # Table data
        header_data = [["Task Name", "Owner of Task", "Project Name", "Status", "Completion date"]]

        for task in tasks_data:
            header_data.append([
                create_wrapped_text(task["Task Name"]),
                create_wrapped_text(task["Owner of Task"]),
                create_wrapped_text(task["Project Name"]),
                create_wrapped_text(task["Status"]),
                create_wrapped_text(task["Completion date"])
            ])
    else:
        header_data = [["Task Name", "Owner of Task", "Assignee List", "Status", "Completion date"]]

        for task in tasks_data:
            header_data.append([
                create_wrapped_text(task["Task Name"]),
                create_wrapped_text(task["Owner of Task"]),
                create_wrapped_text(task["Assignee List"]),
                create_wrapped_text(task["Status"]),
                create_wrapped_text(task["Completion date"])
            ])

    col_widths = [1.8*inch, 1.6*inch, 1.3*inch, 1.3*inch]
    task_table = Table(header_data, colWidths=col_widths, repeatRows=1)

    task_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495E')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 1), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#BDC3C7')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8F9F9')]),
    ]))

    elements.append(task_table)
    elements.append(Spacer(1, 0.4*inch))

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

def generate_project_summary_report(projects_data, filename="project_summary_report.pdf", report_type="Project", timeFrame="Undefined"):
    """New function for project summary reports"""
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch,
        title="Project Summary Report",
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
        alignment=1,
        wordWrap='CJK'
    )
    elements.append(Paragraph("Project Summary Report", title_style))

    # Subtitle
    subtitle_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=30,
        textColor=colors.HexColor('#7F8C8D'),
        alignment=1
    )
    elements.append(Paragraph(f"Summary Report for {report_type} - Timeframe: {timeFrame}", subtitle_style))

    def create_wrapped_text(text, style_name='Normal'):
        style = ParagraphStyle(
            style_name,
            parent=styles['Normal'],
            fontSize=9,
            leading=11,
            alignment=1,
            wordWrap='CJK'
        )
        return Paragraph(str(text), style)

    # Add your project summary table logic here
    project_header_data = [["Task Name", "Assignee List", "Status", "Deadline"]]
    
    for project in projects_data:
        project_header_data.append([
            create_wrapped_text(project["Task Name"]),
            create_wrapped_text(project["Assignee List"]),
            create_wrapped_text(project["Status"]),
            create_wrapped_text(project["Deadline"])
            # project.get("Task Title", ""),
            # project.get("Assignee", ""),
            # project.get("Status", ""),
            # project.get("Deadline", ""),
            # str(project.get("Total Tasks", 0)),
            # str(project.get("Completed", 0)),
            # f"{project.get('Progress', 0)}%"
        ])

    col_widths = [2.0*inch, 1.5*inch, 1.0*inch, 1.0*inch, 1.0*inch]
    project_table = Table(project_header_data, colWidths=col_widths, repeatRows=1)

    project_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495E')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 1), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#BDC3C7')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8F9F9')]),
    ]))

    elements.append(project_table)
    elements.append(Spacer(1, 0.4*inch))

    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#7F8C8D'),
        alignment=1
    )
    elements.append(Paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d at %H:%M')} | Project Summary View", footer_style))

    doc.build(elements)
    return True


def generate_logged_time_report(tasks_data, filename="logged_time_report.pdf", report_type="Project", timeFrame="Undefined"):
    """Generate logged time reports"""
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        topMargin=0.5*inch,
        bottomMargin=0.5*inch,
        title="Logged Time Report",  # Fixed title
        author="Little Farms System"
    )

    elements = []
    styles = getSampleStyleSheet()

    # Title - Fixed to match report type
    title_style = ParagraphStyle(
        'MainTitle',
        parent=styles['Heading1'],
        fontSize=16,
        spaceAfter=20,
        textColor=colors.HexColor('#2C3E50'),
        alignment=1,
        wordWrap='CJK'
    )
    elements.append(Paragraph("Logged Time Report", title_style))  # Correct title

    # Subtitle
    subtitle_style = ParagraphStyle(
        'SubTitle',
        parent=styles['Normal'],
        fontSize=12,
        spaceAfter=30,
        textColor=colors.HexColor('#7F8C8D'),
        alignment=1
    )
    elements.append(Paragraph(f"Time Report for {report_type} - Timeframe: {timeFrame}", subtitle_style))

    def create_wrapped_text(text, style_name='Normal'):
        style = ParagraphStyle(
            style_name,
            parent=styles['Normal'],
            fontSize=9,
            leading=11,
            alignment=1,
            wordWrap='CJK'
        )
        return Paragraph(str(text), style)

    # Table data for logged time
    table_data = [["Project Name", "Task Name", "Staff Name", "Department", "Hours"]]
    
    for task in tasks_data:
        table_data.append([
            create_wrapped_text(task.get("Project Name", "")),
            create_wrapped_text(task.get("Task Name", "")),
            create_wrapped_text(task.get("Staff Name", "")),
            create_wrapped_text(task.get("Department", "")),
            create_wrapped_text(task.get("No. of Hours", "0"))
        ])

    # Adjust column widths for better fit
    col_widths = [1.8*inch, 1.8*inch, 1.5*inch, 1.2*inch, 0.7*inch]
    time_table = Table(table_data, colWidths=col_widths, repeatRows=1)

    time_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#34495E')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
        ('BOTTOMPADDING', (0, 0), (-1, 0), 10),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 9),
        ('ALIGN', (0, 1), (-1, -1), 'CENTER'),
        ('VALIGN', (0, 1), (-1, -1), 'MIDDLE'),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#BDC3C7')),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F8F9F9')]),
    ]))

    elements.append(time_table)
    elements.append(Spacer(1, 0.4*inch))

    # Footer with correct view name
    footer_style = ParagraphStyle(
        'Footer',
        parent=styles['Normal'],
        fontSize=8,
        textColor=colors.HexColor('#7F8C8D'),
        alignment=1
    )
    elements.append(Paragraph(f"Generated on {datetime.now().strftime('%Y-%m-%d at %H:%M')} | Logged Time View", footer_style))

    doc.build(elements)
    return True

# Report function mapping
REPORT_FUNCTIONS = {
    'task-completion': generate_task_completion_report,
    'team-summary': generate_project_summary_report,
    'logged-time': generate_logged_time_report,
    # Add more report types here as you create them
}

def main():
    try:
        # Read data from stdin
        input_data = sys.stdin.read()
        
        if not input_data:
            print("Error: No input data provided", file=sys.stderr)
            sys.exit(1)
            
        # Parse JSON data
        config = json.loads(input_data)
        
        report_type = config.get('report_type', 'task-completion')
        report_function = REPORT_FUNCTIONS.get(report_type)
        
        if not report_function:
            print(f"Error: Unknown report type '{report_type}'", file=sys.stderr)
            sys.exit(1)
        
        # Extract parameters
        filename = config.get('filename', f'{report_type}_report.pdf')
        timeFrame = config.get('timeFrame', 'Undefined')
        report_title = config.get('report_title', 'Report')
        filter_type = config.get('filter_type', 'undefined')
        raw_data = config.get('data', [])
        
        if not raw_data:
            print(f"Error: No data provided for {report_type} report", file=sys.stderr)
            sys.exit(1)
        
        # Transform data using appropriate mapper
        data_mapper = REPORT_MAPPERS.get(report_type)
        if data_mapper:
            if report_type == 'task-completion':
                processed_data = data_mapper(raw_data, filter_type)
            else:
                processed_data = data_mapper(raw_data)
        else:
            processed_data = raw_data
        
        # Generate report
        if report_type == 'task-completion':
            success = report_function(processed_data, filename, report_title, timeFrame, filter_type)
        else:
            success = report_function(processed_data, filename, report_title, timeFrame)
        
        sys.exit(0 if success else 1)
        
    except Exception as e:
        print(f"Error generating report: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()