import{$a as t,Ia as r,Ma as o,Xb as d,ab as s,bb as n,fa as i,qb as l}from"./chunk-55FWP5KL.js";var c=class p{constructor(e){this.el=e;this.htmlContent=`
        <!-- PASTE THE FULL CONTENT OF it_resource_dashboard_combined.html HERE (everything EXCEPT the <script src="chart.js"> tag) -->
    `}ngAfterViewInit(){let e=this.el.nativeElement.querySelector("[\\#chartHost]")||this.el.nativeElement.querySelector('div[class="ceo-content-card"] > div');this.renderHTML(e)}renderHTML(e){if(e.innerHTML=this.getBodyHTML(),window.Chart)this.runChartScript(e);else{let a=document.createElement("script");a.src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/chart.umd.js",a.onload=()=>this.runChartScript(e),document.head.appendChild(a)}}runChartScript(e){let a=document.createElement("script");a.textContent=this.getChartScript(),e.appendChild(a)}getBodyHTML(){return`
<div style="display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin-bottom:1.75rem;">
  <div style="background:var(--color-background-secondary,#f0f0f0); border-radius:8px; padding:1rem;">
    <p style="font-size:13px; color:#666; margin:0 0 4px;"><i class="ti ti-users" style="font-size:14px; vertical-align:-2px; margin-right:4px;"></i>Total resources (FTE)</p>
    <p style="font-size:24px; font-weight:500; margin:0;">34</p>
  </div>
  <div style="background:var(--color-background-secondary,#f0f0f0); border-radius:8px; padding:1rem;">
    <p style="font-size:13px; color:#666; margin:0 0 4px;"><i class="ti ti-stack-2" style="font-size:14px; vertical-align:-2px; margin-right:4px;"></i>Active projects</p>
    <p style="font-size:24px; font-weight:500; margin:0;">11</p>
  </div>
  <div style="background:var(--color-background-secondary,#f0f0f0); border-radius:8px; padding:1rem;">
    <p style="font-size:13px; color:#666; margin:0 0 4px;"><i class="ti ti-id-badge-2" style="font-size:14px; vertical-align:-2px; margin-right:4px;"></i>Role types</p>
    <p style="font-size:24px; font-weight:500; margin:0;">4</p>
  </div>
  <div style="background:var(--color-background-secondary,#f0f0f0); border-radius:8px; padding:1rem;">
    <p style="font-size:13px; color:#666; margin:0 0 4px;"><i class="ti ti-chart-pie" style="font-size:14px; vertical-align:-2px; margin-right:4px;"></i>Avg FTE / project</p>
    <p style="font-size:24px; font-weight:500; margin:0;">3.1</p>
  </div>
</div>

<p style="font-size:14px; font-weight:500; margin:0 0 0.75rem;">Resources by project</p>
<div style="display:flex; gap:24px; align-items:center; margin-bottom:2rem; flex-wrap:wrap;">
  <div style="position:relative; width:190px; height:190px; flex-shrink:0;">
    <canvas id="dashPie"></canvas>
  </div>
  <div style="display:grid; grid-template-columns:1fr 1fr; gap:7px 16px; font-size:12px; flex:1; min-width:260px;">
    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;"><span style="display:flex;align-items:center;gap:6px;white-space:nowrap;"><span style="width:9px;height:9px;border-radius:2px;background:#7F77DD;flex-shrink:0;"></span>Stemz Health Care</span><span style="color:#888;">12 - 35%</span></div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;"><span style="display:flex;align-items:center;gap:6px;white-space:nowrap;"><span style="width:9px;height:9px;border-radius:2px;background:#E24B4A;flex-shrink:0;"></span>L1 Support</span><span style="color:#888;">5 - 15%</span></div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;"><span style="display:flex;align-items:center;gap:6px;white-space:nowrap;"><span style="width:9px;height:9px;border-radius:2px;background:#639922;flex-shrink:0;"></span>Internal Systems</span><span style="color:#888;">4 - 12%</span></div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;"><span style="display:flex;align-items:center;gap:6px;white-space:nowrap;"><span style="width:9px;height:9px;border-radius:2px;background:#1D9E75;flex-shrink:0;"></span>ND Diagnostics India</span><span style="color:#888;">2 - 6%</span></div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;"><span style="display:flex;align-items:center;gap:6px;white-space:nowrap;"><span style="width:9px;height:9px;border-radius:2px;background:#D85A30;flex-shrink:0;"></span>ND Phisantae</span><span style="color:#888;">2 - 6%</span></div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;"><span style="display:flex;align-items:center;gap:6px;white-space:nowrap;"><span style="width:9px;height:9px;border-radius:2px;background:#D4537E;flex-shrink:0;"></span>Soul Space</span><span style="color:#888;">2 - 6%</span></div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;"><span style="display:flex;align-items:center;gap:6px;white-space:nowrap;"><span style="width:9px;height:9px;border-radius:2px;background:#378ADD;flex-shrink:0;"></span>Cancer Care</span><span style="color:#888;">2 - 6%</span></div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;"><span style="display:flex;align-items:center;gap:6px;white-space:nowrap;"><span style="width:9px;height:9px;border-radius:2px;background:#888780;flex-shrink:0;"></span>Common Data Lake</span><span style="color:#888;">2 - 6%</span></div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;"><span style="display:flex;align-items:center;gap:6px;white-space:nowrap;"><span style="width:9px;height:9px;border-radius:2px;background:#0F6E56;flex-shrink:0;"></span>MIS</span><span style="color:#888;">2 - 6%</span></div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;"><span style="display:flex;align-items:center;gap:6px;white-space:nowrap;"><span style="width:9px;height:9px;border-radius:2px;background:#993C1D;flex-shrink:0;"></span>LIS</span><span style="color:#888;">2 - 6%</span></div>
    <div style="display:flex;align-items:center;justify-content:space-between;gap:6px;"><span style="display:flex;align-items:center;gap:6px;white-space:nowrap;"><span style="width:9px;height:9px;border-radius:2px;background:#4A3F9E;flex-shrink:0;"></span>Stemz Bridge</span><span style="color:#888;">1 - 3%</span></div>
  </div>
</div>

<p style="font-size:14px; font-weight:500; margin:0 0 0.75rem;">Role-wise: who's spread across which projects</p>
<div style="display:flex; flex-wrap:wrap; gap:8px 14px; margin-bottom:10px; font-size:11px; color:#888;">
  <span style="display:flex;align-items:center;gap:4px;"><span style="width:9px;height:9px;border-radius:2px;background:#7F77DD;"></span>Stemz Health Care</span>
  <span style="display:flex;align-items:center;gap:4px;"><span style="width:9px;height:9px;border-radius:2px;background:#E24B4A;"></span>L1 Support</span>
  <span style="display:flex;align-items:center;gap:4px;"><span style="width:9px;height:9px;border-radius:2px;background:#639922;"></span>Internal Systems</span>
  <span style="display:flex;align-items:center;gap:4px;"><span style="width:9px;height:9px;border-radius:2px;background:#1D9E75;"></span>ND Diagnostics India</span>
  <span style="display:flex;align-items:center;gap:4px;"><span style="width:9px;height:9px;border-radius:2px;background:#D85A30;"></span>ND Phisantae</span>
  <span style="display:flex;align-items:center;gap:4px;"><span style="width:9px;height:9px;border-radius:2px;background:#D4537E;"></span>Soul Space</span>
  <span style="display:flex;align-items:center;gap:4px;"><span style="width:9px;height:9px;border-radius:2px;background:#378ADD;"></span>Cancer Care</span>
  <span style="display:flex;align-items:center;gap:4px;"><span style="width:9px;height:9px;border-radius:2px;background:#888780;"></span>Common Data Lake</span>
  <span style="display:flex;align-items:center;gap:4px;"><span style="width:9px;height:9px;border-radius:2px;background:#0F6E56;"></span>MIS</span>
  <span style="display:flex;align-items:center;gap:4px;"><span style="width:9px;height:9px;border-radius:2px;background:#993C1D;"></span>LIS</span>
  <span style="display:flex;align-items:center;gap:4px;"><span style="width:9px;height:9px;border-radius:2px;background:#4A3F9E;"></span>Stemz Bridge</span>
</div>
<div style="position:relative; width:100%; height:260px; margin-bottom:2.25rem;">
  <canvas id="dashRoleStack"></canvas>
</div>

<p style="font-size:14px; font-weight:500; margin:0 0 0.75rem;">Project-wise: what each project is staffed with</p>
<div style="display:flex; flex-wrap:wrap; gap:14px; margin-bottom:10px; font-size:12px; color:#888;">
  <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:#7F77DD;"></span>Developer</span>
  <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:#1D9E75;"></span>Testers</span>
  <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:#D85A30;"></span>Project management</span>
  <span style="display:flex;align-items:center;gap:5px;"><span style="width:10px;height:10px;border-radius:2px;background:#D4537E;"></span>Business analysts</span>
</div>
<div style="position:relative; width:100%; height:360px;">
  <canvas id="dashProjectStack"></canvas>
</div>
        `}getChartScript(){return`
(function(){
  var isDark = window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches;
  var textColor = isDark ? '#B4B2A9' : '#5F5E5A';
  var gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)';
  var labelColor = isDark ? '#F1EFE8' : '#2C2C2A';

  // Updated project data based on the new table
  var projectLabels = ['Glosys','In app','Bridge','CDL','Non functional','Cancer Care','ERP','L1 Support','Soulspace','CMS','MIS'];
  var projectColors = ['#7F77DD','#E24B4A','#639922','#1D9E75','#D85A30','#D4537E','#378ADD','#888780','#0F6E56','#993C1D','#4A3F9E'];
  var projectData = [12,2,1,1,1,2,1,5,2,3,4];

  // PIE CHART
  new Chart(document.getElementById('dashPie'), {
    type: 'pie',
    data: { 
      labels: projectLabels, 
      datasets: [{ 
        data: projectData, 
        backgroundColor: projectColors, 
        borderWidth: 1, 
        borderColor: 'rgba(255,255,255,0.4)' 
      }] 
    },
    options: { 
      responsive: true, 
      maintainAspectRatio: false, 
      plugins: { 
        legend: { display: false }, 
        tooltip: { 
          callbacks: { 
            label: function(c){ 
              return c.label + ': ' + c.parsed + ' FTE (' + Math.round(c.parsed/34*100) + '%)'; 
            } 
          } 
        } 
      } 
    }
  });

  // ROLE-WISE CHART - Updated: Business analysts instead of Project Management
  var roleLabels = ['Business analysts','Developer','L2 Support','Testers'];
  var projectsForRoleChart = [
    { name: 'Glosys', color: '#7F77DD', data: [1,5,2,4] },
    { name: 'In app', color: '#E24B4A', data: [1,1,0,0] },
    { name: 'Bridge', color: '#639922', data: [0,1,0,0] },
    { name: 'CDL', color: '#1D9E75', data: [0,1,0,0] },
    { name: 'Non functional', color: '#D85A30', data: [0,1,0,0] },
    { name: 'Cancer Care', color: '#D4537E', data: [1,1,0,0] },
    { name: 'ERP', color: '#378ADD', data: [0,1,0,0] },
    { name: 'L1 Support', color: '#888780', data: [0,5,0,0] },
    { name: 'Soulspace', color: '#0F6E56', data: [0,2,0,0] },
    { name: 'CMS', color: '#993C1D', data: [0,2,0,1] },
    { name: 'MIS', color: '#4A3F9E', data: [0,4,0,0] }
  ];
  
  new Chart(document.getElementById('dashRoleStack'), {
    type: 'bar',
    data: { 
      labels: roleLabels, 
      datasets: projectsForRoleChart.map(function(p){ 
        return { label: p.name, data: p.data, backgroundColor: p.color }; 
      }) 
    },
    options: { 
      indexAxis: 'y', 
      responsive: true, 
      maintainAspectRatio: false, 
      scales: { 
        x: { 
          stacked: true, 
          grid: { color: gridColor }, 
          ticks: { color: textColor, font: { size: 11 } } 
        }, 
        y: { 
          stacked: true, 
          grid: { display: false }, 
          ticks: { color: textColor, font: { size: 12 } } 
        } 
      }, 
      plugins: { 
        legend: { display: false }, 
        tooltip: { 
          callbacks: { 
            label: function(c){ 
              return c.dataset.label + ': ' + c.parsed.x + ' FTE'; 
            } 
          } 
        } 
      } 
    }
  });

  // PROJECT-WISE CHART - Updated: Business analysts instead of Project Management
  var projects = ['Glosys','In app','Bridge','CDL','Non functional','Cancer Care','ERP','L1 Support','Soulspace','CMS','MIS'];
  var totals = [12,2,1,1,1,2,1,5,2,3,4];
  
  var datasetsB = [
    { label: 'Business analysts', data: [1,1,0,0,0,1,0,0,0,0,0], backgroundColor: '#D4537E' },
    { label: 'Developer', data: [5,1,1,1,1,1,1,5,2,2,4], backgroundColor: '#7F77DD' },
    { label: 'L2 Support', data: [2,0,0,0,0,0,0,0,0,0,0], backgroundColor: '#E24B4A' },
    { label: 'Testers', data: [4,0,0,0,0,0,0,0,0,1,0], backgroundColor: '#1D9E75' }
  ];

  new Chart(document.getElementById('dashProjectStack'), {
    type: 'bar',
    data: { labels: projects, datasets: datasetsB },
    options: {
      responsive: true, 
      maintainAspectRatio: false,
      layout: { padding: { top: 30 } },
      scales: {
        x: { 
          stacked: true, 
          grid: { display: false }, 
          ticks: { color: textColor, font: { size: 11 }, maxRotation: 45, minRotation: 45 } 
        },
        y: { 
          stacked: true, 
          grid: { color: gridColor }, 
          ticks: { color: textColor, font: { size: 11 } }, 
          title: { display: true, text: 'FTE', color: textColor, font: { size: 11 } } 
        }
      },
      plugins: { 
        legend: { display: false }, 
        tooltip: { 
          callbacks: { 
            label: function(c){ 
              return c.dataset.label + ': ' + c.parsed.y + ' FTE'; 
            } 
          } 
        } 
      }
    },
    plugins: [{
      id: 'totalLabelsDash',
      afterDraw: function(chart){
        var ctx = chart.ctx;
        ctx.save();
        ctx.font = '500 12px sans-serif';
        ctx.fillStyle = labelColor;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        
        var meta = chart.getDatasetMeta(0);
        meta.data.forEach(function(bar, index) {
          var total = totals[index];
          var topY = chart.scales.y.getPixelForValue(total);
          var xPos = bar.x;
          ctx.fillText(total, xPos, topY - 4);
        });
        ctx.restore();
      }
    }]
  });
})();
    `}static{this.\u0275fac=function(a){return new(a||p)(r(i))}}static{this.\u0275cmp=o({type:p,selectors:[["app-ceo-resourcing"]],decls:8,vars:0,consts:[["chartHost",""],[1,"ceo-page-wrapper"],[1,"ceo-page-header"],[1,"ceo-page-title"],[1,"ti","ti-users"],[1,"ceo-content-card"]],template:function(a,x){a&1&&(t(0,"div",1)(1,"div",2)(2,"h2",3),n(3,"i",4),l(4," IT Resource Dashboard "),s()(),t(5,"div",5),n(6,"div",null,0),s()())},dependencies:[d],styles:[".ceo-page-wrapper[_ngcontent-%COMP%]{padding:24px}.ceo-page-header[_ngcontent-%COMP%]{margin-bottom:20px}.ceo-page-title[_ngcontent-%COMP%]{font-size:18px;font-weight:600;margin:0 0 4px;display:flex;align-items:center;gap:8px}.ceo-page-subtitle[_ngcontent-%COMP%]{font-size:13px;color:#666}.ceo-content-card[_ngcontent-%COMP%]{background:var(--color-background-secondary, #f8f8f8);border-radius:10px;padding:24px;box-shadow:0 1px 4px #00000012}"]})}};export{c as CeoResourcingComponent};
