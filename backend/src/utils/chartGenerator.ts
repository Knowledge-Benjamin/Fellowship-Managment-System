import { ChartConfiguration } from 'chart.js';
import { ChartJSNodeCanvas } from 'chartjs-node-canvas';

const width = 400;
const height = 300;

const chartJSNodeCanvas = new ChartJSNodeCanvas({ width, height });

/**
 * Generate a pie chart image buffer for gender distribution
 */
export const generateGenderPieChart = async (
    maleCount: number,
    femaleCount: number
): Promise<Buffer> => {
    const configuration: ChartConfiguration = {
        type: 'pie',
        data: {
            labels: ['Male', 'Female'],
            datasets: [
                {
                    data: [maleCount, femaleCount],
                    backgroundColor: ['#3b82f6', '#ec4899'],
                    borderColor: ['#2563eb', '#db2777'],
                    borderWidth: 2,
                },
            ],
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: 'Gender Distribution',
                    font: { size: 16, weight: 'bold' },
                    color: '#1e293b',
                },
                legend: {
                    position: 'bottom',
                    labels: {
                        font: { size: 12 },
                        color: '#475569',
                    },
                },
            },
        },
    };

    return await chartJSNodeCanvas.renderToBuffer(configuration);
};

/**
 * Generate a horizontal bar chart for region distribution
 */
export const generateRegionBarChart = async (
    regionData: Record<string, number>
): Promise<Buffer> => {
    const sortedEntries = Object.entries(regionData).sort((a, b) => b[1] - a[1]);
    const labels = sortedEntries.map(([name]) => name);
    const data = sortedEntries.map(([, count]) => count);

    const configuration: ChartConfiguration = {
        type: 'bar',
        data: {
            labels,
            datasets: [
                {
                    label: 'Attendance',
                    data,
                    backgroundColor: '#14b8a6',
                    borderColor: '#0d9488',
                    borderWidth: 1,
                },
            ],
        },
        options: {
            indexAxis: 'y',
            plugins: {
                title: {
                    display: true,
                    text: 'Region Distribution',
                    font: { size: 16, weight: 'bold' },
                    color: '#1e293b',
                },
                legend: {
                    display: false,
                },
            },
            scales: {
                x: {
                    beginAtZero: true,
                    ticks: {
                        color: '#64748b',
                    },
                    grid: {
                        color: '#e2e8f0',
                    },
                },
                y: {
                    ticks: {
                        color: '#64748b',
                        font: { size: 11 },
                    },
                    grid: {
                        display: false,
                    },
                },
            },
        },
    };

    const barChartCanvas = new ChartJSNodeCanvas({ width: 500, height: 300 });
    return await barChartCanvas.renderToBuffer(configuration);
};

/**
 * Generate a line chart for attendance trends over time
 */
export const generateAttendanceTrendChart = async (
    chartData: Array<{ date: string; attendance: number }>
): Promise<Buffer> => {
    const labels = chartData.map((d) => d.date);
    const data = chartData.map((d) => d.attendance);

    const configuration: ChartConfiguration = {
        type: 'line',
        data: {
            labels,
            datasets: [
                {
                    label: 'Attendance',
                    data,
                    borderColor: '#6366f1',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    borderWidth: 2,
                    fill: true,
                    tension: 0.4,
                },
            ],
        },
        options: {
            plugins: {
                title: {
                    display: true,
                    text: 'Attendance Trend',
                    font: { size: 16, weight: 'bold' },
                    color: '#1e293b',
                },
                legend: {
                    display: false,
                },
            },
            scales: {
                x: {
                    ticks: {
                        color: '#64748b',
                        maxRotation: 45,
                        minRotation: 45,
                    },
                    grid: {
                        color: '#e2e8f0',
                    },
                },
                y: {
                    beginAtZero: true,
                    ticks: {
                        color: '#64748b',
                    },
                    grid: {
                        color: '#e2e8f0',
                    },
                },
            },
        },
    };

    const lineChartCanvas = new ChartJSNodeCanvas({ width: 600, height: 300 });
    return await lineChartCanvas.renderToBuffer(configuration);
};
