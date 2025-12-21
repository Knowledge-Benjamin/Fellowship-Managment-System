import PDFDocument from 'pdfkit';
import ExcelJS from 'exceljs';
import { Response } from 'express';
import { generateGenderPieChart, generateRegionBarChart } from '../utils/chartGenerator';

// Define types for report data
interface EventReportData {
    event: {
        id: string;
        name: string;
        date: Date | string;
        type: string;
        status: string;
    };
    stats: {
        totalAttendance: number;
        memberCount: number;
        guestCount: number;
        genderBreakdown: { MALE: number; FEMALE: number };
        regionBreakdown: Record<string, number>;
        firstTimersCount: number;
        salvationBreakdown?: Record<string, number>;
        tagDistribution?: Record<string, number>;
    };
    guests: Array<{ name: string; purpose: string | null }>;
}

interface CustomReportData {
    stats: {
        totalEvents: number;
        totalAttendance: number;
        averageAttendance: number;
        uniqueMembers: number;
        genderBreakdown: { MALE: number; FEMALE: number };
        regionBreakdown: Record<string, number>;
        salvationBreakdown?: Record<string, number>;
        tagDistribution?: Record<string, number>;
    };
    chartData: Array<{
        date: string;
        name: string;
        attendance: number;
    }>;
}

/**
 * Generate PDF for Event Report
 * Preserves existing functionality while adding professional PDF output
 */
export const generateEventReportPDF = async (
    data: EventReportData,
    res: Response
): Promise<void> => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Set response headers for PDF download
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${data.event.name.replace(/\s+/g, '_')}_Report.pdf"`
    );

    // Pipe PDF to response
    doc.pipe(res);

    // HEADER SECTION
    doc.fontSize(24).fillColor('#14b8a6').text('Event Report', { align: 'center' });
    doc.moveDown(0.5);

    // Event Title
    doc.fontSize(18).fillColor('#1e293b').text(data.event.name, { align: 'center' });
    doc.fontSize(10)
        .fillColor('#64748b')
        .text(
            `${new Date(data.event.date).toLocaleDateString()} • ${data.event.status}`,
            { align: 'center' }
        );
    doc.moveDown(2);

    // KEY METRICS SECTION
    doc.fontSize(16).fillColor('#14b8a6').text('Key Metrics');
    doc.moveDown(0.5);

    const startY = doc.y;
    const colWidth = 120;
    const rowHeight = 60;

    // Define metrics in 2x2 grid
    const metrics = [
        { label: 'Total Attendance', value: data.stats.totalAttendance, color: '#6366f1' },
        { label: 'First Timers', value: data.stats.firstTimersCount, color: '#10b981' },
        { label: 'Members', value: data.stats.memberCount, color: '#8b5cf6' },
        { label: 'Guests', value: data.stats.guestCount, color: '#f59e0b' },
    ];

    metrics.forEach((metric, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = 50 + col * (colWidth + 20);
        const y = startY + row * (rowHeight + 10);

        // Draw metric box
        doc.rect(x, y, colWidth, rowHeight).fillAndStroke(metric.color, '#e2e8f0');
        doc.fillColor('#ffffff')
            .fontSize(24)
            .text(metric.value.toString(), x, y + 10, {
                width: colWidth,
                align: 'center',
            });
        doc.fontSize(10).text(metric.label, x, y + 40, { width: colWidth, align: 'center' });
    });

    doc.moveDown(7);

    // CHARTS SECTION
    try {
        // Generate and embed gender pie chart
        const genderChartBuffer = await generateGenderPieChart(
            data.stats.genderBreakdown.MALE,
            data.stats.genderBreakdown.FEMALE
        );
        const regionChartBuffer = await generateRegionBarChart(data.stats.regionBreakdown);

        // Position charts side-by-side
        const chartY = doc.y;

        // Pie chart on the left
        doc.image(genderChartBuffer, 50, chartY, { width: 240 });

        // Bar chart on the right
        doc.image(regionChartBuffer, 310, chartY, { width: 250 });

        // Move cursor below charts
        doc.y = chartY + 320;
    } catch (error) {
        console.error('Chart generation error:', error);
        // Continue without charts if generation fails
    }

    doc.moveDown(2);

    // STATISTICAL SUMMARY
    doc.fillColor('#14b8a6').fontSize(14).text('Statistical Summary');
    doc.moveDown(0.5);

    doc.fillColor('#1e293b')
        .fontSize(11)
        .text(`Total Attendance: ${data.stats.totalAttendance}`, { continued: true })
        .text(`  |  Members: ${data.stats.memberCount}  |  Guests: ${data.stats.guestCount}`);
    doc.text(`First Timers: ${data.stats.firstTimersCount}  (${((data.stats.firstTimersCount / (data.stats.totalAttendance || 1)) * 100).toFixed(1)}%)`);
    doc.moveDown(1);

    // SALVATION STATISTICS
    if (data.stats.salvationBreakdown && Object.keys(data.stats.salvationBreakdown).length > 0) {
        doc.fillColor('#ec4899').fontSize(14).text('Spiritual Decisions');
        doc.moveDown(0.5);
        Object.entries(data.stats.salvationBreakdown).forEach(([type, count]) => {
            doc.fillColor('#1e293b').fontSize(11)
                .text(`${type.replace(/_/g, ' ')}: ${count}`);
        });
        doc.moveDown(1);
    }

    // TAG DISTRIBUTION
    if (data.stats.tagDistribution && Object.keys(data.stats.tagDistribution).length > 0) {
        doc.fillColor('#8b5cf6').fontSize(14).text('Group/Tag Distribution');
        doc.moveDown(0.5);

        // Sort by count descending
        const sortedTags = Object.entries(data.stats.tagDistribution)
            .sort((a, b) => b[1] - a[1]);

        // Render in two columns if possible, or just list
        sortedTags.forEach(([tag, count]) => {
            doc.fillColor('#1e293b').fontSize(11).text(`${tag}: ${count}`);
        });
        doc.moveDown(1);
    }

    // GUEST LIST SECTION (if applicable)
    if (data.guests.length > 0) {
        doc.addPage();
        doc.fillColor('#14b8a6').fontSize(16).text('Guest List');
        doc.moveDown(0.5);

        // Table header
        doc.fillColor('#1e293b').fontSize(11).text('Name', 50, doc.y, { continued: true });
        doc.text('Purpose', 300);
        doc.moveDown(0.3);
        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        // Table rows
        data.guests.forEach((guest) => {
            doc.fontSize(10).text(guest.name, 50, doc.y, {
                continued: true,
                width: 240,
            });
            doc.text(guest.purpose || '-', 300, undefined, { width: 240 });
            doc.moveDown(0.3);
        });
    }

    // FOOTER
    doc.fontSize(8)
        .fillColor('#94a3b8')
        .text(
            `Generated on ${new Date().toLocaleString()} by Fellowship Management System`,
            50,
            doc.page.height - 50,
            { align: 'center' }
        );

    doc.end();
};

/**
 * Generate Excel for Event Report
 * Adds formatted, color-coded Excel export with formulas
 */
export const generateEventReportExcel = async (
    data: EventReportData,
    res: Response
): Promise<void> => {
    const workbook = new ExcelJS.Workbook();

    // SUMMARY SHEET
    const summarySheet = workbook.addWorksheet('Summary', {
        views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }],
    });

    // Header Row
    summarySheet.mergeCells('A1:D1');
    const titleCell = summarySheet.getCell('A1');
    titleCell.value = `${data.event.name} - Event Report`;
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF14b8a6' },
    };
    titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
    summarySheet.getRow(1).height = 30;

    // Event Info
    summarySheet.getCell('A2').value = 'Event Date:';
    summarySheet.getCell('B2').value = new Date(data.event.date).toLocaleDateString();
    summarySheet.getCell('C2').value = 'Status:';
    summarySheet.getCell('D2').value = data.event.status;
    summarySheet.getRow(2).font = { bold: true };

    summarySheet.addRow([]);

    // Key Metrics Section
    summarySheet.addRow(['Metric', 'Value']).font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
    };
    summarySheet.lastRow!.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF475569' },
    };

    const metricsData = [
        ['Total Attendance', data.stats.totalAttendance, '#6366f1'],
        ['Member Count', data.stats.memberCount, '#8b5cf6'],
        ['Guest Count', data.stats.guestCount, '#f59e0b'],
        ['First Timers', data.stats.firstTimersCount, '#10b981'],
        ['Male Attendees', data.stats.genderBreakdown.MALE, '#3b82f6'],
        ['Female Attendees', data.stats.genderBreakdown.FEMALE, '#ec4899'],
    ];

    metricsData.forEach(([label, value, color]) => {
        const row = summarySheet.addRow([label as string, value as number]);
        row.getCell(2).font = { size: 14, bold: true };
        row.getCell(2).fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: (color as string).replace('#', 'FF') },
        };
        row.getCell(2).font.color = { argb: 'FFFFFFFF' };
    });

    summarySheet.addRow([]);

    // Region Breakdown
    summarySheet.addRow(['Region', 'Count']).font = {
        bold: true,
        color: { argb: 'FFFFFFFF' },
    };
    summarySheet.lastRow!.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF475569' },
    };

    Object.entries(data.stats.regionBreakdown)
        .sort((a, b) => b[1] - a[1])
        .forEach(([region, count], index) => {
            const row = summarySheet.addRow([region, count]);
            const maxCount = Math.max(...Object.values(data.stats.regionBreakdown), 1);
            const percentage = count / maxCount;

            let bgColor = 'FFFFFFFF';
            if (percentage > 0.7) {
                bgColor = 'FF14b8a6';
                row.getCell(2).font = { color: { argb: 'FFFFFFFF' }, bold: true };
            } else if (percentage > 0.4) {
                bgColor = 'FF5eead4';
            } else {
                bgColor = 'FFccfbf1';
            }

            row.getCell(2).fill = {
                type: 'pattern',
                pattern: 'solid',
                fgColor: { argb: bgColor },
            };
        });

    summarySheet.addRow([]);

    // Salvation Breakdown
    if (data.stats.salvationBreakdown && Object.keys(data.stats.salvationBreakdown).length > 0) {
        summarySheet.addRow(['Spiritual Decisions', 'Count']).font = {
            bold: true,
            color: { argb: 'FFFFFFFF' },
        };
        summarySheet.lastRow!.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFec4899' }, // Pink header
        };

        Object.entries(data.stats.salvationBreakdown).forEach(([type, count]) => {
            summarySheet.addRow([type.replace(/_/g, ' '), count]);
        });
        summarySheet.addRow([]);
    }

    // Tag Distribution
    if (data.stats.tagDistribution && Object.keys(data.stats.tagDistribution).length > 0) {
        summarySheet.addRow(['Group / Tag', 'Count']).font = {
            bold: true,
            color: { argb: 'FFFFFFFF' },
        };
        summarySheet.lastRow!.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF8b5cf6' }, // Purple header
        };

        Object.entries(data.stats.tagDistribution)
            .sort((a, b) => b[1] - a[1])
            .forEach(([tag, count]) => {
                summarySheet.addRow([tag, count]);
            });
    }

    // Add percentage column for metrics
    summarySheet.getCell('C4').value = 'Percentage';
    summarySheet.getCell('C4').font = { bold: true, color: { argb: 'FFFFFFFF' } };
    summarySheet.getCell('C4').fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF475569' },
    };

    // Add percentages for gender breakdown
    const totalMembers = data.stats.memberCount || 1;
    const malePercentage = ((data.stats.genderBreakdown.MALE / totalMembers) * 100).toFixed(1);
    const femalePercentage = ((data.stats.genderBreakdown.FEMALE / totalMembers) * 100).toFixed(1);

    summarySheet.getCell('C9').value = `${malePercentage}%`;
    summarySheet.getCell('C10').value = `${femalePercentage}%`;

    // Add first-timer percentage
    const firstTimerPercentage = ((data.stats.firstTimersCount / (data.stats.totalAttendance || 1)) * 100).toFixed(1);
    summarySheet.getCell('C8').value = `${firstTimerPercentage}%`;

    // Auto-fit columns
    summarySheet.columns = [{ width: 25 }, { width: 15 }, { width: 15 }, { width: 15 }];

    // Add borders to all cells for better visual separation
    summarySheet.eachRow((row, rowNumber) => {
        if (rowNumber > 3) { // Skip title rows
            row.eachCell((cell) => {
                if (!cell.border) {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFe2e8f0' } },
                        left: { style: 'thin', color: { argb: 'FFe2e8f0' } },
                        bottom: { style: 'thin', color: { argb: 'FFe2e8f0' } },
                        right: { style: 'thin', color: { argb: 'FFe2e8f0' } },
                    };
                }
            });
        }
    });

    // GUEST LIST SHEET (if applicable)
    if (data.guests.length > 0) {
        const guestSheet = workbook.addWorksheet('Guests');

        // Header
        const headerRow = guestSheet.addRow(['Guest Name', 'Purpose']);
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF14b8a6' },
        };
        headerRow.height = 25;
        headerRow.alignment = { vertical: 'middle' };

        // Data rows with alternating colors
        data.guests.forEach((guest, index) => {
            const row = guestSheet.addRow([guest.name, guest.purpose || '-']);
            if (index % 2 === 0) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF1F5F9' },
                };
            }
        });

        guestSheet.columns = [{ width: 30 }, { width: 40 }];
    }

    // Protect Summary sheet
    await summarySheet.protect('fellowship2024', {
        selectLockedCells: true,
        selectUnlockedCells: true,
        formatCells: false,
        formatColumns: false,
        formatRows: false,
        insertRows: false,
        insertColumns: false,
        deleteRows: false,
        deleteColumns: false,
        sort: true,
        autoFilter: true,
    });

    // Set response headers for Excel download
    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
        'Content-Disposition',
        `attachment; filename="${data.event.name.replace(/\s+/g, '_')}_Report.xlsx"`
    );

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
};

/**
 * Generate PDF for Custom Report
 */
export const generateCustomReportPDF = async (
    data: CustomReportData,
    dateRange: { startDate: string; endDate: string },
    res: Response
): Promise<void> => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
        'Content-Disposition',
        `attachment; filename="Custom_Report_${dateRange.startDate}_to_${dateRange.endDate}.pdf"`
    );

    doc.pipe(res);

    // HEADER
    doc.fontSize(24).fillColor('#14b8a6').text('Custom Report', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(12)
        .fillColor('#64748b')
        .text(`${dateRange.startDate} to ${dateRange.endDate}`, { align: 'center' });
    doc.moveDown(2);

    // KEY METRICS
    doc.fontSize(16).fillColor('#14b8a6').text('Overview');
    doc.moveDown(0.5);

    const metrics = [
        { label: 'Total Events', value: data.stats.totalEvents },
        { label: 'Total Attendance', value: data.stats.totalAttendance },
        { label: 'Average Attendance', value: data.stats.averageAttendance },
        { label: 'Unique Members', value: data.stats.uniqueMembers },
    ];

    metrics.forEach((metric) => {
        doc.fillColor('#1e293b').fontSize(12).text(`${metric.label}: ${metric.value}`);
    });

    doc.moveDown(1);

    // GENDER BREAKDOWN
    doc.fillColor('#14b8a6').fontSize(14).text('Gender Distribution');
    doc.moveDown(0.5);
    doc.fillColor('#1e293b')
        .fontSize(12)
        .text(`Male: ${data.stats.genderBreakdown.MALE}`)
        .text(`Female: ${data.stats.genderBreakdown.FEMALE}`);
    doc.moveDown(1);

    // REGION BREAKDOWN
    doc.fillColor('#14b8a6').fontSize(14).text('Region Distribution');
    doc.moveDown(0.5);
    Object.entries(data.stats.regionBreakdown)
        .sort((a, b) => b[1] - a[1])
        .forEach(([region, count]) => {
            doc.fillColor('#1e293b').fontSize(12).text(`${region}: ${count}`);
        });
    doc.moveDown(1);

    // SALVATION STATISTICS
    if (data.stats.salvationBreakdown && Object.keys(data.stats.salvationBreakdown).length > 0) {
        doc.fillColor('#ec4899').fontSize(14).text('Spiritual Decisions');
        doc.moveDown(0.5);
        Object.entries(data.stats.salvationBreakdown).forEach(([type, count]) => {
            doc.fillColor('#1e293b').fontSize(12)
                .text(`${type.replace(/_/g, ' ')}: ${count}`);
        });
        doc.moveDown(1);
    }

    // TAG DISTRIBUTION
    if (data.stats.tagDistribution && Object.keys(data.stats.tagDistribution).length > 0) {
        doc.fillColor('#8b5cf6').fontSize(14).text('Group/Tag Distribution');
        doc.moveDown(0.5);
        Object.entries(data.stats.tagDistribution)
            .sort((a, b) => b[1] - a[1])
            .forEach(([tag, count]) => {
                doc.fillColor('#1e293b').fontSize(12).text(`${tag}: ${count}`);
            });
    }

    // FOOTER
    doc.fontSize(8)
        .fillColor('#94a3b8')
        .text(
            `Generated on ${new Date().toLocaleString()} by Fellowship Management System`,
            50,
            doc.page.height - 50,
            { align: 'center' }
        );

    doc.end();
};

/**
 * Generate Excel for Custom Report
 */
export const generateCustomReportExcel = async (
    data: CustomReportData,
    dateRange: { startDate: string; endDate: string },
    res: Response
): Promise<void> => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Custom Report');

    // Title
    sheet.mergeCells('A1:C1');
    const titleCell = sheet.getCell('A1');
    titleCell.value = 'Custom Report';
    titleCell.font = { size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
    titleCell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF14b8a6' },
    };
    titleCell.alignment = { horizontal: 'center' };
    sheet.getRow(1).height = 30;

    // Date Range
    sheet.getCell('A2').value = 'Period:';
    sheet.getCell('B2').value = `${dateRange.startDate} to ${dateRange.endDate}`;
    sheet.getRow(2).font = { bold: true };
    sheet.addRow([]);

    // Metrics
    const metricsHeader = sheet.addRow(['Metric', 'Value']);
    metricsHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    metricsHeader.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF475569' },
    };

    const statsData = [
        ['Total Events', data.stats.totalEvents],
        ['Total Attendance', data.stats.totalAttendance],
        ['Average Attendance', data.stats.averageAttendance],
        ['Unique Members', data.stats.uniqueMembers],
        ['Male Attendees', data.stats.genderBreakdown.MALE],
        ['Female Attendees', data.stats.genderBreakdown.FEMALE],
    ];

    statsData.forEach(([label, value]) => {
        sheet.addRow([label, value]);
    });

    sheet.addRow([]);

    // Region Breakdown
    const regionHeader = sheet.addRow(['Region', 'Attendance']);
    regionHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    regionHeader.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF475569' },
    };

    Object.entries(data.stats.regionBreakdown)
        .sort((a, b) => b[1] - a[1])
        .forEach(([region, count]) => {
            sheet.addRow([region, count]);
        });

    sheet.addRow([]);

    // Salvation Breakdown
    if (data.stats.salvationBreakdown && Object.keys(data.stats.salvationBreakdown).length > 0) {
        const salvHeader = sheet.addRow(['Spiritual Decisions', 'Count']);
        salvHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        salvHeader.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFec4899' },
        };
        Object.entries(data.stats.salvationBreakdown).forEach(([type, count]) => {
            sheet.addRow([type.replace(/_/g, ' '), count]);
        });
        sheet.addRow([]);
    }

    // Tag Distribution
    if (data.stats.tagDistribution && Object.keys(data.stats.tagDistribution).length > 0) {
        const tagHeader = sheet.addRow(['Group / Tag', 'Count']);
        tagHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
        tagHeader.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF8b5cf6' },
        };
        Object.entries(data.stats.tagDistribution)
            .sort((a, b) => b[1] - a[1])
            .forEach(([tag, count]) => {
                sheet.addRow([tag, count]);
            });
    }

    sheet.columns = [{ width: 25 }, { width: 15 }];

    res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
        'Content-Disposition',
        `attachment; filename="Custom_Report_${dateRange.startDate}_to_${dateRange.endDate}.xlsx"`
    );

    await workbook.xlsx.write(res);
    res.end();
};
