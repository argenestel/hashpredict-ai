import dynamic from 'next/dynamic';

const Chart = dynamic(() => import('react-apexcharts'), {
    ssr: false,
  });

export const ModernChart = ({ graphData }) => {
    // Use a ref to detect dark mode
    const isDark = document.documentElement.classList.contains('dark');
    
    const chartOptions = {
      chart: {
        id: 'prediction-graph',
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 800,
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        },
        background: isDark ? '#111c44' : '#ffffff', // navy-800 : white
        foreColor: isDark ? '#94a3b8' : '#64748b', // gray-400 : gray-500
        toolbar: {
          show: false
        },
        fontFamily: 'Inter, ui-sans-serif, system-ui, -apple-system'
      },
      grid: {
        show: true,
        borderColor: isDark ? '#1e293b' : '#e2e8f0', // navy-700 : gray-200
        strokeDashArray: 3,
        position: 'back',
        xaxis: {
          lines: {
            show: false
          }
        },
        yaxis: {
          lines: {
            show: true
          }
        },
        padding: {
          top: 0,
          right: 10,
          bottom: 0,
          left: 10
        }
      },
      xaxis: {
        type: 'datetime',
        labels: {
          datetimeUTC: false,
          style: {
            colors: isDark ? '#94a3b8' : '#64748b', // gray-400 : gray-500
            fontSize: '12px'
          },
          format: 'MMM dd HH:mm'
        },
        axisBorder: {
          show: false
        },
        axisTicks: {
          show: false
        },
        crosshairs: {
          show: true,
          stroke: {
            color: isDark ? '#334155' : '#e2e8f0', // slate-700 : gray-200
            width: 1,
            dashArray: 3
          }
        },
        tooltip: {
          enabled: true,
          theme: isDark ? 'dark' : 'light',
          style: {
            fontSize: '12px'
          }
        }
      },
      yaxis: [
        {
          title: {
            text: 'Yes Price (APT)',
            style: {
              color: isDark ? '#4ade80' : '#22c55e', // green-400 : green-500
              fontSize: '12px'
            }
          },
          labels: {
            formatter: (value) => (Number(value)).toFixed(2),
            style: {
              colors: isDark ? '#94a3b8' : '#64748b' // gray-400 : gray-500
            }
          },
          tickAmount: 5
        },
        {
          opposite: true,
          title: {
            text: 'No Price (APT)',
            style: {
              color: isDark ? '#f87171' : '#ef4444', // red-400 : red-500
              fontSize: '12px'
            }
          },
          labels: {
            formatter: (value) => (Number(value)).toFixed(2),
            style: {
              colors: isDark ? '#94a3b8' : '#64748b' // gray-400 : gray-500
            }
          },
          tickAmount: 5
        }
      ],
      stroke: {
        curve: 'smooth',
        width: 3
      },
      colors: [
        isDark ? '#4ade80' : '#22c55e', // green-400 : green-500 (Yes line)
        isDark ? '#f87171' : '#ef4444'  // red-400 : red-500 (No line)
      ],
      fill: {
        type: 'gradient',
        gradient: {
          type: 'vertical',
          shadeIntensity: 0.5,
          opacityFrom: 0.35,
          opacityTo: 0.05,
          stops: [0, 100]
        }
      },
      tooltip: {
        shared: true,
        intersect: false,
        theme: isDark ? 'dark' : 'light',
        x: {
          format: 'MMM dd HH:mm'
        },
        y: [{
          title: {
            formatter: () => 'Yes: '
          }
        }, {
          title: {
            formatter: () => 'No: '
          }
        }],
        marker: {
          show: true,
          size: 6,
          fillColors: [
            isDark ? '#4ade80' : '#22c55e',
            isDark ? '#f87171' : '#ef4444'
          ]
        },
        style: {
          fontSize: '12px'
        }
      },
      legend: {
        show: true,
        position: 'top',
        horizontalAlign: 'right',
        floating: true,
        fontSize: '12px',
        markers: {
          width: 8,
          height: 8,
          radius: 12,
          offsetX: 0
        },
        itemMargin: {
          horizontal: 10
        },
        labels: {
          colors: isDark ? '#94a3b8' : '#64748b' // gray-400 : gray-500
        }
      },
      responsive: [{
        breakpoint: 480,
        options: {
          legend: {
            position: 'bottom',
            horizontalAlign: 'center'
          }
        }
      }]
    };
  
    const chartData = [
      {
        name: 'Yes Price',
        data: graphData.map(point => [
          point.timestamp * 1000,
          Number(point.yes_price) / 1e8
        ])
      },
      {
        name: 'No Price',
        data: graphData.map(point => [
          point.timestamp * 1000,
          Number(point.no_price) / 1e8
        ])
      }
    ];
  
    return (
      <div className="mb-6 h-72 p-2">
        <Chart
          options={chartOptions}
          series={chartData}
          type="area"
          width="100%"
          height="100%"
        />
      </div>
    );
  };
  