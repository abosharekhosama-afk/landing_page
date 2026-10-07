import React,{useEffect,useMemo,useState}from 'react';

/**
 * ترقيم من جانب العميل (client-side pagination) لجداول لوحة الإدارة.
 * يعمل على مصفوفة كاملة جاهزة في الذاكرة — لا يمس قاعدة البيانات أو API.
 * الاستخدام:
 *   const pager = useClientPager(items, 10);
 *   const { pageItems, ...rest } = pager;
 *   {pageItems.map(...)}  ← بدل items.map(...)
 *   <ClientPagerControls {...pager} ar={ar} />  ← بعد الجدول
 */
export function useClientPager(items, pageSize = 10) {
  const list = Array.isArray(items) ? items : [];
  const [page, setPage] = React.useState(0);

  const total = list.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  // إرجاع المستخدم لصفحة صالحة إذا غيّر الفلتر/الحذف قلّص القائمة
  const safePage = Math.min(page, totalPages - 1);

  const pageItems = React.useMemo(
    () => list.slice(safePage * pageSize, safePage * pageSize + pageSize),
    [list, safePage, pageSize],
  );

  const goTo = React.useCallback(
    (p) => setPage(Math.min(Math.max(0, p), totalPages - 1)),
    [totalPages],
  );
  const next = React.useCallback(() => goTo(safePage + 1), [goTo, safePage]);
  const prev = React.useCallback(() => goTo(safePage - 1), [goTo, safePage]);

  return {
    page: safePage,
    pageItems,
    totalPages,
    total,
    pageSize,
    goTo,
    next,
    prev,
    hasPrev: safePage > 0,
    hasNext: safePage < totalPages - 1,
  };
}

export function ClientPagerControls({ page, totalPages, total, pageSize, hasPrev, hasNext, prev, next, ar }) {
  if (!total) return null;
  const from = page * pageSize + 1;
  const to = Math.min(total, (page + 1) * pageSize);
  return (
    <div className="row-actions admin-pager" role="navigation" aria-label={ar ? "تنقل الجدول" : "Table pagination"}>
      <button type="button" className="text-action" disabled={!hasPrev} onClick={prev}>
        {ar ? "السابق" : "Previous"}
      </button>
      <span className="admin-pager-info">
        {ar
          ? `صفحة ${page + 1} من ${totalPages} — يعرض ${from}–${to} من ${total}`
          : `Page ${page + 1} of ${totalPages} — showing ${from}–${to} of ${total}`}
      </span>
      <button type="button" className="text-action" disabled={!hasNext} onClick={next}>
        {ar ? "التالي" : "Next"}
      </button>
    </div>
  );
}

export default function Employee4Workspace({title,description,endpoint,columns=[]}){
 const [items,setItems]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[q,setQ]=useState('');
 const load=async()=>{setLoading(true);setError('');try{const r=await fetch(endpoint+(endpoint.includes('?')?'&':'?')+'limit=100',{credentials:'include'});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Request failed');setItems(d.items||d||[])}catch(e){setError(e.message)}finally{setLoading(false)}};
 useEffect(()=>{load()},[endpoint]); const filtered=useMemo(()=>items.filter(x=>JSON.stringify(x).toLowerCase().includes(q.toLowerCase())),[items,q]);
 return <main className="admin-page"><div style={{display:'flex',justifyContent:'space-between',gap:16,alignItems:'center',flexWrap:'wrap'}}><div><h1>{title}</h1><p>{description}</p></div><button onClick={load}>Refresh</button></div><input aria-label={`Search ${title}`} value={q} onChange={e=>setQ(e.target.value)} placeholder="Search…" style={{margin:'16px 0',width:'100%',maxWidth:420}}/>{loading?<p>Loading…</p>:error?<p role="alert">{error}</p>:<div style={{overflow:'auto'}}><table><thead><tr>{columns.map(c=><th key={c.key}>{c.label}</th>)}</tr></thead><tbody>{filtered.map((item,i)=><tr key={item.id||i}>{columns.map(c=><td key={c.key}>{String(c.render?c.render(item):item[c.key]??'—')}</td>)}</tr>)}{!filtered.length&&<tr><td colSpan={Math.max(1,columns.length)}>No records found.</td></tr>}</tbody></table></div>}</main>
}
