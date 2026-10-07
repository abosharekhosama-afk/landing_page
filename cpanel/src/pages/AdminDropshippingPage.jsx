import React from "react";
import AdminLayout from "../components/AdminLayout.jsx";
import { downloadDropshippingReport, dropshippingApi } from "../utils/dropshippingApi.js";

const sectionByPage = {
  "admin-dropshipping": "overview", "admin-dropshipping-marketers": "marketers", "admin-dropshipping-products": "products",
  "admin-dropshipping-orders": "orders", "admin-dropshipping-earnings": "earnings", "admin-dropshipping-withdrawals": "withdrawals",
  "admin-dropshipping-reports": "reports", "admin-dropshipping-settings": "settings",
};
const labels = { overview:"Overview",marketers:"Marketers",products:"Products",orders:"Orders",earnings:"Earnings",withdrawals:"Withdrawals",reports:"Reports",settings:"Settings" };
const money = (value) => Number(value || 0).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:2});
const productColumns = [
  "product_id",
  "id",
  "company_id",
  "enabled",
  "dropshipping_price",
  "suggested_selling_price",
  "minimum_selling_price",
  "maximum_selling_price",
  "stock_qty",
  "name",
  "slug",
  "is_active",
];

function DataTable({ rows, onAction, section }) {
  if (!rows.length) return <div className="dropshipping-empty">No records yet.</div>;
  const hidden = new Set(["payment_details","social_media_accounts","product_snapshot"]);
  const keys = section === "products" ? productColumns : Object.keys(rows[0]).filter((key)=>!hidden.has(key)).slice(0,9);
  return <div className="admin-data-table-wrap dropshipping-table-wrap"><table className="admin-data-table dropshipping-table"><thead><tr>{keys.map(key=><th key={key}>{key.replaceAll("_"," ")}</th>)}{onAction&&<th className="admin-data-table-actions">Actions</th>}</tr></thead><tbody>{rows.map((row,index)=><tr key={row.id||row.product_id||index}>{keys.map(key=><td key={key}><span className="admin-data-table-cell-clip" title={typeof row[key]==="object"?JSON.stringify(row[key]):String(row[key]??"")}>{typeof row[key]==="object"?JSON.stringify(row[key]):String(row[key]??"")}</span></td>)}{onAction&&<td className="admin-data-table-actions">{onAction(row,section)}</td>}</tr>)}</tbody></table></div>;
}

export default function AdminDropshippingPage({ activePage, ...layout }) {
  const section=sectionByPage[activePage]||"overview"; const [data,setData]=React.useState(null); const [error,setError]=React.useState(""); const [busy,setBusy]=React.useState(false);
  const load=React.useCallback(async()=>{setError("");setData(null);try{setData(await dropshippingApi[section]());}catch(e){setError(e.message);}},[section]);
  React.useEffect(()=>{load();},[load]);
  const run=async(path,body={})=>{setBusy(true);setError("");try{await dropshippingApi.action(path,body);await load();}catch(e){setError(e.message);}finally{setBusy(false);}};
  const update=async(path,body)=>{setBusy(true);setError("");try{await dropshippingApi.update(path,body);await load();}catch(e){setError(e.message);}finally{setBusy(false);}};
  const actions=(row)=>{
    if(section==="marketers"&&row.status==="pending")return <><button disabled={busy} onClick={()=>run(`/marketers/${row.id}/approve`)}>Approve</button><button disabled={busy} onClick={()=>{const reason=prompt("Rejection reason");if(reason)run(`/marketers/${row.id}/reject`,{reason});}}>Reject</button></>;
    if(section==="marketers"&&row.status==="approved")return <button disabled={busy} onClick={()=>{const reason=prompt("Suspension reason");if(reason)run(`/marketers/${row.id}/suspend`,{reason});}}>Suspend</button>;
    if(section==="marketers"&&row.status==="suspended")return <button disabled={busy} onClick={()=>run(`/marketers/${row.id}/reactivate`)}>Reactivate</button>;
    if(section==="products")return <button disabled={busy} onClick={async()=>{const dropshippingPrice=prompt("Dropshipping price",row.dropshipping_price??0);if(dropshippingPrice===null)return;const suggestedSellingPrice=prompt("Suggested selling price",row.suggested_selling_price??dropshippingPrice);const minimumSellingPrice=prompt("Minimum selling price",row.minimum_selling_price??dropshippingPrice);const maximumSellingPrice=prompt("Maximum selling price",row.maximum_selling_price??suggestedSellingPrice);setBusy(true);setError("");try{await dropshippingApi.updateProduct(row,{enabled:!row.enabled,dropshippingPrice,suggestedSellingPrice,minimumSellingPrice,maximumSellingPrice,availableStock:row.available_stock??row.stock_qty,allowMediaDownload:true});await load();}catch(e){setError(e.message);}finally{setBusy(false);}}}>{row.enabled?"Disable / update":"Enable / price"}</button>;
    if(section==="orders")return <select disabled={busy} value="" onChange={(e)=>e.target.value&&run(`/orders/${row.id}/status`,{status:e.target.value})}><option value="">Change status</option>{["confirmed","preparing","ready_for_delivery","out_for_delivery","delivered","cancelled","returned"].map(v=><option key={v}>{v}</option>)}</select>;
    if(section==="withdrawals"&&row.status==="pending")return <><button onClick={()=>run(`/withdrawals/${row.id}/approve`)}>Approve</button><button onClick={()=>{const reason=prompt("Rejection reason");if(reason)run(`/withdrawals/${row.id}/reject`,{reason});}}>Reject</button></>;
    if(section==="withdrawals"&&row.status==="approved")return <button onClick={()=>{const referenceNumber=prompt("Payment reference");if(referenceNumber)run(`/withdrawals/${row.id}/pay`,{referenceNumber});}}>Mark paid</button>;
    if(section==="earnings"&&row.transaction_type==="earning_pending")return <button onClick={()=>run(`/earnings/${row.order_id}/release`)}>Release</button>;
    return null;
  };
  const rows=Array.isArray(data)?data:[];
  return <AdminLayout activePage={activePage} title={`Dropshipping · ${labels[section]}`} subtitle="Tenant-scoped marketer operations" {...layout}>
    {error&&<div className="admin-status-message error">{error}</div>}{data===null&&!error&&<div className="dropshipping-empty">Loading…</div>}
    {section==="overview"&&data&&(()=>{
      const n=(k)=>Number(data[k]||0);
      const primary=[
        ["total_marketers","Total Marketers"],
        ["total_orders","Total Orders"],
        ["total_sales","Total Sales"],
        ["total_marketer_profits","Total Marketer Profits"],
      ];
      const marketers=[
        ["pending_marketers","Pending"],
        ["approved_marketers","Approved"],
        ["suspended_marketers","Suspended"],
      ];
      const orders=[
        ["delivered_orders","Delivered"],
        ["cancelled_orders","Cancelled"],
        ["returned_orders","Returned"],
      ];
      const finance=[
        ["total_sales","Sales"],
        ["total_marketer_profits","Profits"],
        ["pending_withdrawals","Pending Withdrawals"],
      ];
      const allZero=Object.values(data).every((v)=>Number(v||0)===0);
      const moneyKeys=new Set(["total_sales","total_marketer_profits","pending_withdrawals","Sales","Profits"]);
      const renderGroup=(title,entries)=> (
        <section className="dropshipping-metric-group" key={title}>
          <h3>{title}</h3>
          <div className="dropshipping-metrics dropshipping-metrics-compact">
            {entries.map(([key,label])=>{
              const value=data[key]??data[label.toLowerCase().replaceAll(" ","_")]??0;
              const isMoney=moneyKeys.has(key)||/sales|profit|withdrawal/i.test(key);
              return <article key={key}><span>{label}</span><strong>{isMoney?money(value):String(value)}</strong></article>;
            })}
          </div>
        </section>
      );
      return <div className="dropshipping-overview">
        {allZero&&<div className="dropshipping-empty dropshipping-zero-state">No dropshipping activity yet. Metrics will populate when marketers and orders exist.</div>}
        <div className="dropshipping-metrics dropshipping-metrics-primary">
          {primary.map(([key,label])=>{
            const value=n(key);
            const isMoney=/sales|profit/i.test(key);
            return <article key={key}><span>{label}</span><strong>{isMoney?money(value):String(value)}</strong></article>;
          })}
        </div>
        {renderGroup("Marketers",marketers)}
        {renderGroup("Orders",orders)}
        {renderGroup("Finance",finance)}
      </div>;
    })()}
    {section==="settings"&&data&&<SettingsForm value={data} onSave={async body=>{setBusy(true);try{await dropshippingApi.update("/settings",body);await load();}catch(e){setError(e.message);}finally{setBusy(false);}}} busy={busy}/>} 
    {section==="reports"&&<p><button className="admin-signout-button" onClick={()=>downloadDropshippingReport().catch(error=>setError(error.message))}>Export CSV</button></p>}
    {!['overview','settings'].includes(section)&&data&&<DataTable rows={rows} section={section} onAction={actions}/>} 
  </AdminLayout>;
}

function SettingsForm({value,onSave,busy}) { const [form,setForm]=React.useState({dropshippingEnabled:value.dropshipping_enabled,minimumWithdrawalAmount:value.minimum_withdrawal_amount,profitReleaseDelayDays:value.profit_release_delay_days,defaultFixedFee:value.default_fixed_fee,defaultPercentageFee:value.default_percentage_fee});return <form className="dropshipping-settings" onSubmit={e=>{e.preventDefault();onSave(form);}}><label><input type="checkbox" checked={form.dropshippingEnabled} onChange={e=>setForm({...form,dropshippingEnabled:e.target.checked})}/> Dropshipping enabled</label>{Object.entries(form).filter(([k])=>k!=="dropshippingEnabled").map(([key,val])=><label key={key}>{key.replaceAll(/([A-Z])/g," $1")}<input type="number" min="0" value={val} onChange={e=>setForm({...form,[key]:e.target.value})}/></label>)}<button disabled={busy} type="submit">Save settings</button></form> }
