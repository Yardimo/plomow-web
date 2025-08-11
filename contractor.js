const { useEffect, useState } = React;

const JobStore = {
  key: 'plomow_jobs_v1',
  all() {
    try { return JSON.parse(localStorage.getItem(this.key) || '[]'); }
    catch { return []; }
  },
  save(list) {
    localStorage.setItem(this.key, JSON.stringify(list));
    window.dispatchEvent(new Event('plomow:jobs:update'));
  },
  update(id, patch) {
    const list = this.all().map(j => j.id === id ? { ...j, ...patch } : j);
    this.save(list);
  }
};

function currency(n){ return `$${n.toFixed(2)}` }

function useJobs() {
  const [jobs, setJobs] = useState(JobStore.all());
  useEffect(()=>{
    const onUpdate = ()=> setJobs(JobStore.all());
    window.addEventListener('plomow:jobs:update', onUpdate);
    return ()=> window.removeEventListener('plomow:jobs:update', onUpdate);
  },[]);
  return [jobs, setJobs];
}

function App(){
  const [jobs] = useJobs();

  const grouped = {
    open: jobs.filter(j => j.status === 'open'),
    assigned: jobs.filter(j => j.status === 'assigned'),
    inProgress: jobs.filter(j => j.status === 'inProgress'),
    completed: jobs.filter(j => j.status === 'completed'),
  };

  function setStatus(id, status){ JobStore.update(id, { status }); }

  return (
    <div className="list">
      <h2>Open Jobs</h2>
      {grouped.open.length === 0 && <p className="badge">No open jobs yet.</p>}
      {grouped.open.map(j => <JobCard key={j.id} job={j} onAction={(s)=>setStatus(j.id, s)} />)}

      <h2>Assigned</h2>
      {grouped.assigned.length === 0 && <p className="badge">None.</p>}
      {grouped.assigned.map(j => <JobCard key={j.id} job={j} onAction={(s)=>setStatus(j.id, s)} />)}

      <h2>In Progress</h2>
      {grouped.inProgress.length === 0 && <p className="badge">None.</p>}
      {grouped.inProgress.map(j => <JobCard key={j.id} job={j} onAction={(s)=>setStatus(j.id, s)} />)}

      <h2>Completed</h2>
      {grouped.completed.length === 0 && <p className="badge">None.</p>}
      {grouped.completed.map(j => <JobCard key={j.id} job={j} onAction={(s)=>setStatus(j.id, s)} />)}
    </div>
  );
}

function JobCard({ job, onAction }){
  return (
    <div className="item">
      <div className="meta">
        <span className="badge-soft">{new Date(job.createdAt).toLocaleString()}</span>
        <span className="badge-soft">{job.address || 'No address'}</span>
        <span className="badge-soft">{job.service}</span>
        <span className="badge-soft">Area: {job.areaM2} m²</span>
        {job.edgeM ? <span className="badge-soft">Edge: {job.edgeM} m</span> : null}
        <span className="badge-soft">Price: {currency(job.price)}</span>
        <span className={`badge-soft status-${job.status}`}>Status: {job.status}</span>
      </div>
      <div className="actions">
        {job.status === 'open' && <button className="primary" onClick={()=>onAction('assigned')}>Accept</button>}
        {job.status === 'assigned' && <button className="primary" onClick={()=>onAction('inProgress')}>Start</button>}
        {job.status === 'inProgress' && <button className="primary" onClick={()=>onAction('completed')}>Complete</button>}
        {(job.status === 'assigned' || job.status === 'inProgress') &&
          <button onClick={()=>onAction('open')}>Unassign</button>
        }
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
