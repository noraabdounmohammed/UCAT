// DataVisualization component for Apple-styled charts
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import './apple-question-styles.css';

// Define types for data visualization props
interface DataVisualizationProps {
  type?: string;
  data?: Array<{
    label?: string;
    value?: number;
  }> | Record<string, unknown> | null;
}

// Apple's color palette for charts
const COLORS = [
  '#007AFF', // Apple Blue
  '#34C759', // Apple Green
  '#FF9500', // Apple Orange
  '#FF3B30', // Apple Red
  '#5856D6', // Apple Purple
  '#AF52DE', // Apple Pink
  '#5AC8FA', // Apple Light Blue
  '#FFCC00'  // Apple Yellow
];

/**
 * DataVisualization component for rendering different types of charts
 * following Apple's Human Interface Guidelines
 */
export function DataVisualization({ type = 'bar_chart', data }: DataVisualizationProps) {
  // Debug the incoming data
  console.log('DataVisualization received:', { type, data });
  
  // Define chart data type
  interface ChartDataItem {
    name: string;
    value: number;
  }
  
  // If no data is provided, create sample data
  let chartData: ChartDataItem[] = [];
  
  if (!data) {
    console.log('No data provided, using sample data');
    chartData = [
      { name: 'Sample A', value: 25 },
      { name: 'Sample B', value: 40 },
      { name: 'Sample C', value: 30 },
      { name: 'Sample D', value: 15 },
      { name: 'Sample E', value: 55 }
    ];
  } else if (Array.isArray(data)) {
    // Format array data for charts
    chartData = data.map(item => {
      // Handle case where item might not have the expected structure
      const label = typeof item.label === 'string' ? item.label : String(item.label || 'Unknown');
      const value = typeof item.value === 'number' ? item.value : 0;
      
      return {
        name: label,
        value: value
      };
    });
  } else if (typeof data === 'object' && data !== null) {
    // Handle object data format
    chartData = Object.entries(data).map(([key, value]) => ({
      name: key,
      value: typeof value === 'number' ? value : 0
    }));
  }
  
  console.log('Formatted chart data:', chartData);

  // Render different chart types based on the provided type
  switch (type) {
    case 'bar_chart':
      return (
        <div className="apple-chart-container" data-testid="bar-chart">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#8E8E93' }}
                axisLine={{ stroke: '#E5E5EA' }}
                tickLine={{ stroke: '#E5E5EA' }}
              />
              <YAxis 
                tick={{ fill: '#8E8E93' }}
                axisLine={{ stroke: '#E5E5EA' }}
                tickLine={{ stroke: '#E5E5EA' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '10px',
                  border: 'none',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 20 }} />
              <Bar dataKey="value" fill="#007AFF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );

    case 'line_chart':
      return (
        <div className="apple-chart-container" data-testid="line-chart">
          <ResponsiveContainer width="100%" height={300}>
            <LineChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#8E8E93' }}
                axisLine={{ stroke: '#E5E5EA' }}
                tickLine={{ stroke: '#E5E5EA' }}
              />
              <YAxis 
                tick={{ fill: '#8E8E93' }}
                axisLine={{ stroke: '#E5E5EA' }}
                tickLine={{ stroke: '#E5E5EA' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '10px',
                  border: 'none',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 20 }} />
              <Line 
                type="monotone" 
                dataKey="value" 
                stroke="#007AFF" 
                strokeWidth={2}
                dot={{ stroke: '#007AFF', strokeWidth: 2, fill: '#FFFFFF', r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      );

    case 'pie_chart':
      return (
        <div className="apple-chart-container" data-testid="pie-chart">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {chartData.map((_, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '10px',
                  border: 'none',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      );

    case 'table':
      return (
        <div className="apple-table-container" data-testid="data-table">
          <table className="apple-data-table">
            <thead>
              <tr>
                <th>Label</th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {chartData.map((item, index) => (
                <tr key={index}>
                  <td>{item.name}</td>
                  <td>{item.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );

    default:
      // Default to bar chart if type is not recognized
      console.log('Unknown chart type, defaulting to bar chart:', type);
      return (
        <div className="apple-chart-container" data-testid="default-chart">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart
              data={chartData}
              margin={{ top: 20, right: 30, left: 20, bottom: 40 }}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
              <XAxis 
                dataKey="name" 
                tick={{ fill: '#8E8E93' }}
                axisLine={{ stroke: '#E5E5EA' }}
                tickLine={{ stroke: '#E5E5EA' }}
              />
              <YAxis 
                tick={{ fill: '#8E8E93' }}
                axisLine={{ stroke: '#E5E5EA' }}
                tickLine={{ stroke: '#E5E5EA' }}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: 'rgba(255, 255, 255, 0.95)',
                  borderRadius: '10px',
                  border: 'none',
                  boxShadow: '0 2px 10px rgba(0, 0, 0, 0.1)'
                }}
              />
              <Legend wrapperStyle={{ paddingTop: 20 }} />
              <Bar dataKey="value" fill="#007AFF" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      );
  }
}
