'use client'
import { useUser, UserButton } from '@clerk/nextjs'
import { useState, useEffect, useCallback } from 'react'

// ─── Field IDs ────────────────────────────────────────────────────────────────
const F = {
  props: {
    addr:'fldPCfrAU7n0oyyqu', city:'fldC5OxARGAEBeeo2', state:'fldzL5iJWqMzgj6hx',
    zip:'fldXyCqTHL9szxzBQ', market:'fldonvSd8NFuBRVtA', type:'flds5RRHGtVBM2gnS',
    acreage:'fldZx4L6AwN9qiB4Q', sf:'fldxEZeQUh9R8cVH5', zoning:'fldGx2L3rcE2I0rLM',
    status:'fldTlRXgmtBTYf9SU', tags:'fldm9HghT3q26ZMsv', entity:'fldd44KpKY8zultPw',
    ownerName:'fldx08mwoq8PlrecC', ownerPhone:'fldTfuaHM8RSGTzMm', ownerEmail:'fld513363jvGHKNfP',
    notes:'fldkJt6B4vkPUsnPn',
  },
  lists: {
    name:'fld8iqpBelw9Ga29z', notes:'fldIBfgDFh9eE9Bx4', market:'fldXV8Vgk1SB9DYPZ',
    status:'fldj0FrBEYuudrm3k', structure:'fld4F1sepqpzGj1TK', price:'fldyZ1V6jvD7AueJW',
    rate:'fldAlQwOYkpo1qULd', commRate:'fld981Dc9dQuEB1X7', estComm:'fldGpI0TdDmJ16Hq3',
    listDate:'fldVqn4mpiBXhK7Nu', expDate:'fldI3bOYe3MY0Kr5S', coBroker:'fld4MiP5z1m31N4Yh',
    offer:'fldfEjBxKJytPBxMq', offerStatus:'fld35gfXh9RxbCyZn', buyerTenant:'fldIGGNa8jEtJzQJe',
    prop:'fld8ZZESoDX9fmId8'
  },
  deals: {
    name:'fldfT39RPCAkMVoWf', notes:'fldseqQS6iLOv0Ln1', tenant:'fldD0aHHpZDVdXivp',
    brokerage:'fldi82T8IbdLzYZg5', market:'fldcj07QCXsMaM7jH', stage:'fldwhxl7ZPFyYcyah',
    structure:'fldlHCqxqYSaKJr8a', value:'fldQtiJ3mTx32oJ7j', commRate:'fldZZGuzFaMOL9IK8',
    estComm:'fldhD4kHKqlfJH5xD', ca:'fldui3IgoNXjbVUIF', landlordEntity:'fldWDxomOKB32GyFx',
    landlordContact:'fldAsb6cx4FQf3XTj', prop:'flduTpBjJwpdZpHS5', closeDate:'fldH0eM8Gc36FnijH',
    linkedListing:'fld8IWlv8VHypXdkE'
  },
  conts: {
    name:'fldJ4df8xFGOMTU1s', notes:'fldkUXgfLY31R91GT', company:'fldXtXH57OPkwiMc4',
    role:'fldOeJ48TH3YxiarB', phone:'fldBOdWoi5uhLwVzy', email:'fldaIw5qDzyonfrzI',
    linkedProp:'fldXIiQsMi57ADm2C', linkedListing:'fldgta3Kntbecc2I4', linkedDeal:'fldbqsE3I0H7ZbT2V'
  },
  acts: {
    desc:'fldQCJlcgD8e3X7Tb', notes:'fldHx1oRkZ8tiDD5N', date:'fldmKmuF5CbQ9vRVG',
    type:'fldkHpFQGtwxlpLDt', outcome:'fldLjKDO8jLl1lb0B', fuDate:'fldKk7B9PaSrYP5YF',
    fuAction:'fldX189YvmonY8sQ6', fuDone:'fldHJ9kC6zgItNooF', linkedProp:'fldcLAWrKEMTtnbPm',
    linkedListing:'fldS58s3JVZO6x3XD', linkedDeal:'fldfddqdINnh78lcv', linkedContact:'fld7E7AgO6z2yoFqd'
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt$ = n => n ? '$' + Number(n).toLocaleString('en-US', {maximumFractionDigits:0}) : '—'
const fv = (fields, key) => {
  const v = fields?.[key]
  if (!v) return ''
  if (Array.isArray(v)) return v.map(x => typeof x === 'object' ? x.name || x.id : x).join(', ')
  if (typeof v === 'object' && v.name) return v.name
  return String(v)
}
const linked = (fields, key) => fields?.[key] || []

const STAGE_COLORS = {
  'Executed':'#dcfce7,#16a34a','Closed':'#dcfce7,#16a34a','LOI Accepted':'#dcfce7,#16a34a','Active':'#dbeafe,#1d4ed8',
  'Lease Draft':'#fef9c3,#a16207','Lease Negotiation':'#fef9c3,#a16207','PSA Draft':'#fef9c3,#a16207',
  'PSA Negotiation':'#fef9c3,#a16207','LOI Submitted':'#fef9c3,#a16207','LOI Prepared':'#fef9c3,#a16207',
  'Under Contract':'#fef9c3,#a16207','Offer Received':'#fef9c3,#a16207',
  'Target Identified':'#f3f4f6,#6b7280','Outreach':'#f3f4f6,#6b7280','Dead':'#fee2e2,#dc2626','Withdrawn':'#f3f4f6,#6b7280','Expired':'#f3f4f6,#6b7280',
  'For Sale':'#dbeafe,#1d4ed8','For Lease':'#e8f0e9,#316828','For Sale & Lease':'#f0edd8,#c69425',
}

function Badge({ value }) {
  if (!value) return null
  const v = typeof value === 'object' ? value.name : value
  const colors = STAGE_COLORS[v] || '#f3f4f6,#6b7280'
  const [bg, fg] = colors.split(',')
  return <span style={{ background: bg, color: fg, padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, display: 'inline-block' }}>{v}</span>
}

// ─── API calls ────────────────────────────────────────────────────────────────
async function apiCreate(table, fields) {
  const res = await fetch('/api/records', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, fields }) })
  return res.json()
}
async function apiUpdate(table, id, fields) {
  const res = await fetch('/api/records', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, id, fields }) })
  return res.json()
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function DetailRow({ label, value }) {
  return (
    <div style={{ display: 'flex', padding: '8px 0', borderBottom: '1px solid #f0edd8' }}>
      <div style={{ width: '150px', fontSize: '12px', color: '#6b7280', fontWeight: 500, flexShrink: 0 }}>{label}</div>
      <div style={{ fontSize: '13px', color: '#1a1a1a', flex: 1 }}>{value || '—'}</div>
    </div>
  )
}

function StatCard({ label, value, color }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e2dcc8', borderRadius: '10px', padding: '14px 16px' }}>
      <div style={{ fontSize: '11px', color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '6px' }}>{label}</div>
      <div style={{ fontSize: '22px', fontWeight: 700, color: color || '#1a1a1a' }}>{value}</div>
    </div>
  )
}

function SearchInput({ label, records, nameField, subField, onSelect, placeholder }) {
  const [q, setQ] = useState('')
  const [open, setOpen] = useState(false)
  const matches = q ? records.filter(r => (fv(r.fields, nameField) || '').toLowerCase().includes(q.toLowerCase())).slice(0, 8) : []
  return (
    <div style={{ marginBottom: '10px' }}>
      {label && <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }}>{label}</label>}
      <div style={{ position: 'relative' }}>
        <input style={inp} value={q} placeholder={placeholder || 'Search...'} onChange={e => { setQ(e.target.value); setOpen(true) }} onBlur={() => setTimeout(() => setOpen(false), 150)} />
        {open && matches.length > 0 && (
          <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, background: '#fff', border: '1px solid #e2dcc8', borderRadius: '6px', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', zIndex: 50, maxHeight: '160px', overflowY: 'auto' }}>
            {matches.map(r => (
              <div key={r.id} style={{ padding: '8px 10px', cursor: 'pointer', borderBottom: '1px solid #f5f2e8' }}
                onMouseEnter={e => e.currentTarget.style.background = '#f9f7f0'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                onMouseDown={() => { setQ(fv(r.fields, nameField)); setOpen(false); onSelect(r.id) }}>
                <div style={{ fontSize: '13px', fontWeight: 500 }}>{fv(r.fields, nameField)}</div>
                {subField && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{fv(r.fields, subField)}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const inp = { width: '100%', border: '1px solid #e2dcc8', borderRadius: '6px', padding: '8px 10px', fontSize: '13px', outline: 'none', background: '#fff', color: '#1a1a1a', boxSizing: 'border-box' }
const row2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }
const row3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }
const fgrp = { marginBottom: '10px' }
const flbl = { display: 'block', fontSize: '12px', fontWeight: 600, color: '#374151', marginBottom: '4px' }
const btnPrimary = { background: '#316828', color: '#f0edd8', border: 'none', borderRadius: '7px', padding: '8px 16px', fontSize: '13px', fontWeight: 600, cursor: 'pointer' }
const btnSecondary = { background: '#fff', color: '#374151', border: '1px solid #e2dcc8', borderRadius: '7px', padding: '8px 16px', fontSize: '13px', fontWeight: 500, cursor: 'pointer' }
const btnBack = { background: 'none', border: '1px solid #e2dcc8', borderRadius: '6px', padding: '5px 12px', fontSize: '13px', cursor: 'pointer', color: '#6b7280' }
const tbl = { width: '100%', borderCollapse: 'collapse' }
const th = { padding: '8px 12px', textAlign: 'left', fontSize: '11px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.06em', borderBottom: '1px solid #e2dcc8', background: '#faf8f0', whiteSpace: 'nowrap' }
const td = { padding: '10px 12px', fontSize: '13px', borderBottom: '1px solid #f5f2e8', verticalAlign: 'middle' }
const card = { background: '#fff', border: '1px solid #e2dcc8', borderRadius: '10px', overflow: 'hidden', marginBottom: '16px' }
const secTitle = { fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }
const computed = { background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '6px', padding: '8px 12px', marginTop: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }

const calcTotalRent = (base, term, incType, incAmt, incInt) => {
  let total = 0, cur = base
  for (let yr = 1; yr <= term; yr++) {
    if (incType && incAmt && incInt && yr > 1 && (yr - 1) % incInt === 0) {
      const steps = Math.floor((yr - 1) / incInt)
      cur = incType === '%' ? base * Math.pow(1 + incAmt / 100, steps) : base + incAmt * steps
    }
    total += cur
  }
  return total
}

// ─── Deal Form ────────────────────────────────────────────────────────────────
function DealForm({ data, props, lists, onSave, onCancel }) {
  const editing = !!data
  const g = f => data ? (data.fields[f] !== undefined ? data.fields[f] : '') : ''
  const gs = f => data ? (fv(data.fields, f) || '') : ''

  const [name, setName] = useState(gs(F.deals.name))
  const [tenant, setTenant] = useState(gs(F.deals.tenant))
  const [stage, setStage] = useState(gs(F.deals.stage) || 'Target Identified')
  const [structure, setStructure] = useState(gs(F.deals.structure))
  const [market, setMarket] = useState(gs(F.deals.market))
  const [commRate, setCommRate] = useState(g(F.deals.commRate) ? (g(F.deals.commRate)*100).toFixed(2) : '')
  const [closeDate, setCloseDate] = useState(gs(F.deals.closeDate))
  const [landlordEntity, setLandlordEntity] = useState(gs(F.deals.landlordEntity))
  const [landlordContact, setLandlordContact] = useState(gs(F.deals.landlordContact))
  const [ca, setCa] = useState(!!g(F.deals.ca))
  const [notes, setNotes] = useState(g(F.deals.notes) || '')
  const [propId, setPropId] = useState(null)
  const [listId, setListId] = useState(null)
  const [psf, setPsf] = useState('')
  const [sf, setSf] = useState('')
  const [term, setTerm] = useState('')
  const [annualRent, setAnnualRent] = useState(editing ? (g(F.deals.value) || '') : '')
  const [purchase, setPurchase] = useState('')
  const [incType, setIncType] = useState('')
  const [incAmt, setIncAmt] = useState('')
  const [incInt, setIncInt] = useState('')
  const [saving, setSaving] = useState(false)

  const annualBase = parseFloat(psf) * parseFloat(sf) || 0
  const termN = parseInt(term) || 0
  const commRateN = parseFloat(commRate) || 0
  let dealValue = 0
  if (structure === 'Lease') dealValue = calcTotalRent(annualBase, termN, incType, parseFloat(incAmt)||0, parseInt(incInt)||0)
  else if (structure === 'Ground Lease') dealValue = calcTotalRent(parseFloat(annualRent)||0, termN, incType, parseFloat(incAmt)||0, parseInt(incInt)||0)
  else if (structure === 'Purchase') dealValue = parseFloat(purchase) || 0
  if (editing && !dealValue) dealValue = g(F.deals.value) || 0
  const estComm = commRateN && dealValue ? dealValue * commRateN / 100 : 0

  const handleSave = async () => {
    if (!name) return alert('Deal name required')
    setSaving(true)
    const fields = {
      [F.deals.name]: name,
      [F.deals.tenant]: tenant || undefined,
      [F.deals.stage]: stage,
      [F.deals.structure]: structure || undefined,
      [F.deals.market]: market || undefined,
      [F.deals.value]: dealValue || undefined,
      [F.deals.commRate]: commRateN ? commRateN / 100 : undefined,
      [F.deals.estComm]: estComm || undefined,
      [F.deals.closeDate]: closeDate || undefined,
      [F.deals.landlordEntity]: landlordEntity || undefined,
      [F.deals.landlordContact]: landlordContact || undefined,
      [F.deals.ca]: ca,
      [F.deals.notes]: notes || undefined,
      [F.deals.prop]: propId ? [{ id: propId }] : undefined,
      [F.deals.linkedListing]: listId ? [{ id: listId }] : undefined,
    }
    const clean = Object.fromEntries(Object.entries(fields).filter(([,v]) => v !== undefined))
    if (editing) await apiUpdate('deals', data.id, clean)
    else await apiCreate('deals', clean)
    setSaving(false)
    onSave()
  }

  return (
    <div>
      <SearchInput label="Property" records={props} nameField={F.props.addr} subField={F.props.city} onSelect={setPropId} placeholder="Search property..." />
      <SearchInput label="Linked Listing" records={lists} nameField={F.lists.name} subField={F.lists.market} onSelect={setListId} placeholder="Search listings..." />
      <div style={fgrp}><label style={flbl}>Deal Name *</label><input style={inp} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. 7 Brew – Medina" /></div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Tenant / Client</label><input style={inp} value={tenant} onChange={e=>setTenant(e.target.value)} list="tenants" /><datalist id="tenants"><option>7 Brew</option><option>Cricket Wireless</option><option>Portillo's</option><option>Biggby Coffee</option></datalist></div>
        <div style={fgrp}><label style={flbl}>Stage</label><select style={inp} value={stage} onChange={e=>setStage(e.target.value)}>{['Target Identified','Outreach','LOI Prepared','LOI Submitted','LOI Accepted','Lease Negotiation','Lease Draft','PSA Negotiation','PSA Draft','Executed','Dead'].map(s=><option key={s}>{s}</option>)}</select></div>
      </div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Structure</label><select style={inp} value={structure} onChange={e=>setStructure(e.target.value)}><option value="">Select...</option><option>Lease</option><option>Ground Lease</option><option>Purchase</option></select></div>
        <div style={fgrp}><label style={flbl}>Market</label><input style={inp} value={market} onChange={e=>setMarket(e.target.value)} /></div>
      </div>

      {structure === 'Lease' && (
        <div style={{ background: '#faf8f0', border: '1px solid #e2dcc8', borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
          <div style={secTitle}>Lease Terms</div>
          <div style={row2}>
            <div style={fgrp}><label style={flbl}>Term (Yrs)</label><input style={inp} type="number" value={term} onChange={e=>setTerm(e.target.value)} /></div>
            <div style={fgrp}><label style={flbl}>Building SF</label><input style={inp} type="number" value={sf} onChange={e=>setSf(e.target.value)} /></div>
          </div>
          <div style={fgrp}><label style={flbl}>Base Rent PSF/yr</label><input style={inp} type="number" step="0.01" value={psf} onChange={e=>setPsf(e.target.value)} /></div>
          <div style={row3}>
            <div style={fgrp}><label style={flbl}>Inc. Type</label><select style={inp} value={incType} onChange={e=>setIncType(e.target.value)}><option value="">None</option><option>%</option><option>Flat $</option></select></div>
            <div style={fgrp}><label style={flbl}>Amount</label><input style={inp} type="number" step="0.01" value={incAmt} onChange={e=>setIncAmt(e.target.value)} /></div>
            <div style={fgrp}><label style={flbl}>Every N Yrs</label><input style={inp} type="number" value={incInt} onChange={e=>setIncInt(e.target.value)} /></div>
          </div>
          {dealValue > 0 && <div style={{ fontSize: '12px', color: '#316828', background: '#e8f0e9', borderRadius: '6px', padding: '7px 10px' }}>Annual: <strong>{fmt$(annualBase)}</strong> · Total Value: <strong>{fmt$(dealValue)}</strong></div>}
        </div>
      )}

      {structure === 'Ground Lease' && (
        <div style={{ background: '#faf8f0', border: '1px solid #e2dcc8', borderRadius: '8px', padding: '12px', marginBottom: '10px' }}>
          <div style={secTitle}>Ground Lease Terms</div>
          <div style={row2}>
            <div style={fgrp}><label style={flbl}>Term (Yrs)</label><input style={inp} type="number" value={term} onChange={e=>setTerm(e.target.value)} /></div>
            <div style={fgrp}><label style={flbl}>Annual Base Rent $</label><input style={inp} type="number" value={annualRent} onChange={e=>setAnnualRent(e.target.value)} /></div>
          </div>
          <div style={row3}>
            <div style={fgrp}><label style={flbl}>Inc. Type</label><select style={inp} value={incType} onChange={e=>setIncType(e.target.value)}><option value="">None</option><option>%</option><option>Flat $</option></select></div>
            <div style={fgrp}><label style={flbl}>Amount</label><input style={inp} type="number" step="0.01" value={incAmt} onChange={e=>setIncAmt(e.target.value)} /></div>
            <div style={fgrp}><label style={flbl}>Every N Yrs</label><input style={inp} type="number" value={incInt} onChange={e=>setIncInt(e.target.value)} /></div>
          </div>
          {dealValue > 0 && <div style={{ fontSize: '12px', color: '#316828', background: '#e8f0e9', borderRadius: '6px', padding: '7px 10px' }}>Total Ground Lease Value ({term} yr): <strong>{fmt$(dealValue)}</strong></div>}
        </div>
      )}

      {structure === 'Purchase' && (
        <div style={fgrp}><label style={flbl}>Purchase Price $</label><input style={inp} type="number" value={purchase} onChange={e=>setPurchase(e.target.value)} /></div>
      )}

      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Commission Rate %</label><input style={inp} type="number" step="0.01" value={commRate} onChange={e=>setCommRate(e.target.value)} /></div>
        <div style={fgrp}><label style={flbl}>Projected Close Date</label><input style={inp} type="date" value={closeDate} onChange={e=>setCloseDate(e.target.value)} /></div>
      </div>
      {estComm > 0 && <div style={computed}><span style={{ fontSize: '12px', color: '#316828', fontWeight: 500 }}>Est. Commission</span><span style={{ fontSize: '18px', fontWeight: 700, color: '#316828' }}>{fmt$(estComm)}</span></div>}
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Landlord Entity</label><input style={inp} value={landlordEntity} onChange={e=>setLandlordEntity(e.target.value)} /></div>
        <div style={fgrp}><label style={flbl}>Landlord Contact</label><input style={inp} value={landlordContact} onChange={e=>setLandlordContact(e.target.value)} /></div>
      </div>
      <div style={fgrp}><label style={flbl}>CA Executed</label><div style={{ paddingTop: '6px' }}><input type="checkbox" checked={ca} onChange={e=>setCa(e.target.checked)} style={{ marginRight: '6px' }} /><span style={{ fontSize: '13px' }}>CA Signed</span></div></div>
      <div style={fgrp}><label style={flbl}>Notes</label><textarea style={{ ...inp, minHeight: '70px', resize: 'vertical' }} value={notes} onChange={e=>setNotes(e.target.value)} /></div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2dcc8' }}>
        <button style={btnSecondary} onClick={onCancel}>Cancel</button>
        <button style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Save Deal'}</button>
      </div>
    </div>
  )
}

// ─── Listing Form ─────────────────────────────────────────────────────────────
function ListingForm({ data, props, onSave, onCancel }) {
  const editing = !!data
  const g = f => data ? (data.fields[f] !== undefined ? data.fields[f] : '') : ''
  const gs = f => data ? (fv(data.fields, f) || '') : ''
  const [name, setName] = useState(gs(F.lists.name))
  const [structure, setStructure] = useState(gs(F.lists.structure))
  const [status, setStatus] = useState(gs(F.lists.status) || 'Active')
  const [price, setPrice] = useState(g(F.lists.price) || '')
  const [commRate, setCommRate] = useState(g(F.lists.commRate) ? (g(F.lists.commRate)*100).toFixed(2) : '')
  const [listDate, setListDate] = useState(gs(F.lists.listDate))
  const [expDate, setExpDate] = useState(gs(F.lists.expDate))
  const [coBroker, setCoBroker] = useState(gs(F.lists.coBroker))
  const [offer, setOffer] = useState(gs(F.lists.offer))
  const [offerStatus, setOfferStatus] = useState(gs(F.lists.offerStatus))
  const [buyerTenant, setBuyerTenant] = useState(gs(F.lists.buyerTenant))
  const [notes, setNotes] = useState(g(F.lists.notes) || '')
  const [propId, setPropId] = useState(null)
  const [saving, setSaving] = useState(false)
  const estComm = price && commRate ? parseFloat(price) * parseFloat(commRate) / 100 : 0
  const handleSave = async () => {
    if (!name) return alert('Listing name required')
    setSaving(true)
    const fields = { [F.lists.name]:name, [F.lists.structure]:structure||undefined, [F.lists.status]:status, [F.lists.price]:parseFloat(price)||undefined, [F.lists.commRate]:parseFloat(commRate)?parseFloat(commRate)/100:undefined, [F.lists.estComm]:estComm||undefined, [F.lists.listDate]:listDate||undefined, [F.lists.expDate]:expDate||undefined, [F.lists.coBroker]:coBroker||undefined, [F.lists.offer]:offer||undefined, [F.lists.offerStatus]:offerStatus||undefined, [F.lists.buyerTenant]:buyerTenant||undefined, [F.lists.notes]:notes||undefined, [F.lists.prop]:propId?[{id:propId}]:undefined }
    const clean = Object.fromEntries(Object.entries(fields).filter(([,v]) => v !== undefined))
    if (editing) await apiUpdate('lists', data.id, clean)
    else await apiCreate('lists', clean)
    setSaving(false); onSave()
  }
  return (
    <div>
      <SearchInput label="Property" records={props} nameField={F.props.addr} subField={F.props.city} onSelect={setPropId} placeholder="Search property..." />
      <div style={fgrp}><label style={flbl}>Listing Name *</label><input style={inp} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. 960 N Leavitt – Amherst" /></div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Structure</label><select style={inp} value={structure} onChange={e=>setStructure(e.target.value)}><option value="">Select...</option><option>For Sale</option><option>For Lease</option><option>For Sale &amp; Lease</option></select></div>
        <div style={fgrp}><label style={flbl}>Status</label><select style={inp} value={status} onChange={e=>setStatus(e.target.value)}>{['Active','Offer Received','Under Contract','Closed','Expired','Withdrawn'].map(s=><option key={s}>{s}</option>)}</select></div>
      </div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Asking Price $</label><input style={inp} type="number" value={price} onChange={e=>setPrice(e.target.value)} /></div>
        <div style={fgrp}><label style={flbl}>Commission Rate %</label><input style={inp} type="number" step="0.1" value={commRate} onChange={e=>setCommRate(e.target.value)} /></div>
      </div>
      {estComm > 0 && <div style={computed}><span style={{ fontSize: '12px', color: '#316828', fontWeight: 500 }}>Est. Commission</span><span style={{ fontSize: '18px', fontWeight: 700, color: '#316828' }}>{fmt$(estComm)}</span></div>}
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Listing Date</label><input style={inp} type="date" value={listDate} onChange={e=>setListDate(e.target.value)} /></div>
        <div style={fgrp}><label style={flbl}>Expiration Date</label><input style={inp} type="date" value={expDate} onChange={e=>setExpDate(e.target.value)} /></div>
      </div>
      <div style={fgrp}><label style={flbl}>Co-Broker</label><input style={inp} value={coBroker} onChange={e=>setCoBroker(e.target.value)} /></div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Current Offer / LOI</label><input style={inp} value={offer} onChange={e=>setOffer(e.target.value)} /></div>
        <div style={fgrp}><label style={flbl}>Offer Status</label><select style={inp} value={offerStatus} onChange={e=>setOfferStatus(e.target.value)}><option value="">Select...</option><option>Offer Received</option><option>Under Review</option><option>Accepted</option><option>Rejected</option><option>Counter</option></select></div>
      </div>
      <div style={fgrp}><label style={flbl}>Buyer / Tenant</label><input style={inp} value={buyerTenant} onChange={e=>setBuyerTenant(e.target.value)} /></div>
      <div style={fgrp}><label style={flbl}>Notes</label><textarea style={{ ...inp, minHeight: '70px', resize: 'vertical' }} value={notes} onChange={e=>setNotes(e.target.value)} /></div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2dcc8' }}>
        <button style={btnSecondary} onClick={onCancel}>Cancel</button>
        <button style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : editing ? 'Save Changes' : 'Save Listing'}</button>
      </div>
    </div>
  )
}

// ─── Activity Form ────────────────────────────────────────────────────────────
function ActivityForm({ props, deals, lists, onSave, onCancel, prefillDealId, prefillListId, prefillPropId }) {
  const [desc, setDesc] = useState('')
  const [type, setType] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [outcome, setOutcome] = useState('')
  const [fuDate, setFuDate] = useState('')
  const [fuAction, setFuAction] = useState('')
  const [notes, setNotes] = useState('')
  const [propId, setPropId] = useState(prefillPropId || null)
  const [dealId, setDealId] = useState(prefillDealId || null)
  const [listId, setListId] = useState(prefillListId || null)
  const [saving, setSaving] = useState(false)
  const handleSave = async () => {
    if (!desc) return alert('Activity required')
    setSaving(true)
    const fields = { [F.acts.desc]:desc, [F.acts.type]:type||undefined, [F.acts.date]:date, [F.acts.outcome]:outcome||undefined, [F.acts.fuDate]:fuDate||undefined, [F.acts.fuAction]:fuAction||undefined, [F.acts.notes]:notes||undefined, [F.acts.linkedProp]:propId?[{id:propId}]:undefined, [F.acts.linkedDeal]:dealId?[{id:dealId}]:undefined, [F.acts.linkedListing]:listId?[{id:listId}]:undefined }
    const clean = Object.fromEntries(Object.entries(fields).filter(([,v]) => v !== undefined))
    await apiCreate('acts', clean)
    setSaving(false); onSave()
  }
  return (
    <div>
      <div style={fgrp}><label style={flbl}>Activity *</label><input style={inp} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="e.g. Called owner re: Medina pad" /></div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Type</label><select style={inp} value={type} onChange={e=>setType(e.target.value)}><option value="">Select...</option>{['Call','Email','Meeting','Site Visit','LOI','Lease','Note','Other'].map(t=><option key={t}>{t}</option>)}</select></div>
        <div style={fgrp}><label style={flbl}>Date</label><input style={inp} type="date" value={date} onChange={e=>setDate(e.target.value)} /></div>
      </div>
      <div style={fgrp}><label style={flbl}>Outcome</label><input style={inp} value={outcome} onChange={e=>setOutcome(e.target.value)} /></div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Follow-Up Date</label><input style={inp} type="date" value={fuDate} onChange={e=>setFuDate(e.target.value)} /></div>
        <div style={fgrp}><label style={flbl}>Follow-Up Action</label><input style={inp} value={fuAction} onChange={e=>setFuAction(e.target.value)} /></div>
      </div>
      <SearchInput label="Linked Property" records={props} nameField={F.props.addr} subField={F.props.city} onSelect={setPropId} placeholder="Search property..." />
      <SearchInput label="Linked Deal" records={deals} nameField={F.deals.name} subField={F.deals.tenant} onSelect={setDealId} placeholder="Search deals..." />
      <SearchInput label="Linked Listing" records={lists} nameField={F.lists.name} subField={F.lists.market} onSelect={setListId} placeholder="Search listings..." />
      <div style={fgrp}><label style={flbl}>Notes</label><textarea style={{ ...inp, minHeight: '60px', resize: 'vertical' }} value={notes} onChange={e=>setNotes(e.target.value)} /></div>
      <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2dcc8' }}>
        <button style={btnSecondary} onClick={onCancel}>Cancel</button>
        <button style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }} onClick={handleSave} disabled={saving}>{saving ? 'Saving...' : 'Log Activity'}</button>
      </div>
    </div>
  )
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ title, onClose, children, wide }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 100, display: 'flex', alignItems: 'flex-start', justifyContent: 'center', padding: '40px 16px', overflowY: 'auto' }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background: '#fff', borderRadius: '12px', width: wide ? '700px' : '520px', maxWidth: '100%', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 18px', borderBottom: '1px solid #e2dcc8' }}>
          <div style={{ fontSize: '15px', fontWeight: 700 }}>{title}</div>
          <button style={{ background: 'none', border: 'none', fontSize: '20px', color: '#9ca3af', cursor: 'pointer' }} onClick={onClose}>×</button>
        </div>
        <div style={{ padding: '16px 18px' }}>{children}</div>
      </div>
    </div>
  )
}

// ─── Activity log table ───────────────────────────────────────────────────────
function ActsTable({ acts }) {
  const sorted = [...acts].sort((a,b) => (b.fields[F.acts.date]||'').localeCompare(a.fields[F.acts.date]||''))
  if (!sorted.length) return <div style={{ color: '#9ca3af', fontSize: '13px', padding: '12px 0' }}>No activities logged yet.</div>
  return (
    <div style={card}>
      <table style={tbl}>
        <thead><tr><th style={th}>Activity</th><th style={th}>Type</th><th style={th}>Date</th><th style={th}>Outcome</th><th style={th}>Follow-Up</th><th style={th}>Done</th></tr></thead>
        <tbody>{sorted.map(a => (
          <tr key={a.id}>
            <td style={td}><div style={{ fontWeight: 500 }}>{fv(a.fields, F.acts.desc) || '—'}</div>{a.fields[F.acts.notes] && <div style={{ fontSize: '11px', color: '#9ca3af', marginTop: '2px' }}>{a.fields[F.acts.notes]}</div>}</td>
            <td style={{ ...td, color: '#6b7280' }}>{fv(a.fields, F.acts.type) || '—'}</td>
            <td style={{ ...td, color: '#6b7280' }}>{fv(a.fields, F.acts.date) || '—'}</td>
            <td style={{ ...td, color: '#6b7280' }}>{fv(a.fields, F.acts.outcome) || '—'}</td>
            <td style={{ ...td, color: '#6b7280' }}>{fv(a.fields, F.acts.fuDate) || '—'}{a.fields[F.acts.fuAction] && <div style={{ fontSize: '11px', color: '#9ca3af' }}>{a.fields[F.acts.fuAction]}</div>}</td>
            <td style={td}>{a.fields[F.acts.fuDone] ? <span style={{ color: '#316828', fontWeight: 700 }}>✓</span> : '—'}</td>
          </tr>
        ))}</tbody>
      </table>
    </div>
  )
}

// ─── Deal Detail ──────────────────────────────────────────────────────────────
function DealDetail({ deal, allData, onBack, onRefresh }) {
  const [modal, setModal] = useState(null)
  const { props, lists, acts, conts } = allData
  const f = deal.fields
  const linkedPropRef = linked(f, F.deals.prop)[0]
  const linkedProp = linkedPropRef ? props.find(p => p.id === linkedPropRef.id) : null
  const linkedListRef = linked(f, F.deals.linkedListing)[0]
  const linkedList = linkedListRef ? lists.find(l => l.id === linkedListRef.id) : null
  const dealActs = acts.filter(a => linked(a.fields, F.acts.linkedDeal).some(l => l.id === deal.id))
  const dealConts = conts.filter(c => linked(c.fields, F.conts.linkedDeal).some(l => l.id === deal.id))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <button style={btnBack} onClick={onBack}>← Back</button>
        <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'DM Serif Display, serif' }}>{fv(f, F.deals.name)}</div>
        <Badge value={f[F.deals.stage]} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button style={btnSecondary} onClick={() => { setModal('activity') }}>+ Log Activity</button>
          <button style={btnPrimary} onClick={() => setModal('edit')}>Edit Deal</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '16px' }}>
        <StatCard label="Deal Value" value={fmt$(f[F.deals.value])} />
        <StatCard label="Est. Commission" value={fmt$(f[F.deals.estComm])} color="#c69425" />
        <StatCard label="Comm. Rate" value={f[F.deals.commRate] ? (f[F.deals.commRate]*100).toFixed(2)+'%' : '—'} />
        <StatCard label="Close Date" value={fv(f, F.deals.closeDate) || '—'} color="#316828" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
        <div style={{ ...card, padding: '16px', marginBottom: 0 }}>
          <div style={secTitle}>Deal Details</div>
          <DetailRow label="Tenant / Client" value={fv(f, F.deals.tenant)} />
          <DetailRow label="Structure" value={fv(f, F.deals.structure)} />
          <DetailRow label="Market" value={fv(f, F.deals.market)} />
          <DetailRow label="CA Executed" value={f[F.deals.ca] ? '✓ Yes' : 'No'} />
          <DetailRow label="Landlord Entity" value={fv(f, F.deals.landlordEntity)} />
          <DetailRow label="Landlord Contact" value={fv(f, F.deals.landlordContact)} />
          {f[F.deals.notes] && <div style={{ marginTop: '10px' }}><div style={{ fontSize: '12px', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>Notes</div><div style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>{f[F.deals.notes]}</div></div>}
        </div>
        <div style={{ ...card, padding: '16px', marginBottom: 0 }}>
          <div style={secTitle}>Property Info</div>
          {linkedProp ? <>
            <DetailRow label="Address" value={fv(linkedProp.fields, F.props.addr)} />
            <DetailRow label="City" value={fv(linkedProp.fields, F.props.city)} />
            <DetailRow label="Zoning" value={fv(linkedProp.fields, F.props.zoning)} />
            <DetailRow label="Acreage" value={linkedProp.fields[F.props.acreage] || '—'} />
            <DetailRow label="Building SF" value={linkedProp.fields[F.props.sf] ? Number(linkedProp.fields[F.props.sf]).toLocaleString() : '—'} />
            <DetailRow label="Owner" value={fv(linkedProp.fields, F.props.ownerName)} />
          </> : <div style={{ color: '#9ca3af', fontSize: '13px' }}>No property linked</div>}
          {linkedList && <>
            <div style={{ marginTop: '12px', ...secTitle }}>Linked Listing</div>
            <DetailRow label="Name" value={fv(linkedList.fields, F.lists.name)} />
            <DetailRow label="Status" value={fv(linkedList.fields, F.lists.status)} />
            <DetailRow label="Asking Price" value={fmt$(linkedList.fields[F.lists.price])} />
          </>}
        </div>
      </div>

      {dealConts.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Contacts ({dealConts.length})</div>
          <div style={card}>
            <table style={tbl}>
              <thead><tr><th style={th}>Name</th><th style={th}>Role</th><th style={th}>Phone</th><th style={th}>Email</th></tr></thead>
              <tbody>{dealConts.map(c => <tr key={c.id}><td style={td}><div style={{ fontWeight: 500 }}>{fv(c.fields, F.conts.name)}</div></td><td style={{ ...td, color: '#6b7280' }}>{fv(c.fields, F.conts.role)}</td><td style={td}>{fv(c.fields, F.conts.phone)}</td><td style={{ ...td, color: '#6b7280' }}>{fv(c.fields, F.conts.email)}</td></tr>)}</tbody>
            </table>
          </div>
        </div>
      )}

      <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Activity Log ({dealActs.length})</div>
      <ActsTable acts={dealActs} />

      {modal === 'edit' && <Modal title="Edit Deal" onClose={() => setModal(null)} wide><DealForm data={deal} props={props} lists={lists} onSave={() => { setModal(null); onRefresh() }} onCancel={() => setModal(null)} /></Modal>}
      {modal === 'activity' && <Modal title="Log Activity" onClose={() => setModal(null)}><ActivityForm props={props} deals={allData.deals} lists={lists} prefillDealId={deal.id} onSave={() => { setModal(null); onRefresh() }} onCancel={() => setModal(null)} /></Modal>}
    </div>
  )
}

// ─── Listing Detail ───────────────────────────────────────────────────────────
function ListingDetail({ listing, allData, onBack, onRefresh }) {
  const [modal, setModal] = useState(null)
  const { props, deals, acts, conts } = allData
  const f = listing.fields
  const linkedPropRef = linked(f, F.lists.prop)[0]
  const linkedProp = linkedPropRef ? props.find(p => p.id === linkedPropRef.id) : null
  const listDeals = deals.filter(d => linked(d.fields, F.deals.linkedListing).some(l => l.id === listing.id))
  const listActs = acts.filter(a => linked(a.fields, F.acts.linkedListing).some(l => l.id === listing.id))
  const listConts = conts.filter(c => linked(c.fields, F.conts.linkedListing).some(l => l.id === listing.id))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <button style={btnBack} onClick={onBack}>← Back</button>
        <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'DM Serif Display, serif' }}>{fv(f, F.lists.name)}</div>
        <Badge value={f[F.lists.status]} />
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '8px' }}>
          <button style={btnSecondary} onClick={() => setModal('activity')}>+ Log Activity</button>
          <button style={btnPrimary} onClick={() => setModal('edit')}>Edit Listing</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '16px' }}>
        <StatCard label="Asking Price" value={fmt$(f[F.lists.price])} />
        <StatCard label="Est. Commission" value={fmt$(f[F.lists.estComm])} color="#c69425" />
        <StatCard label="Acreage" value={linkedProp?.fields[F.props.acreage] || '—'} />
        <StatCard label="Building SF" value={linkedProp?.fields[F.props.sf] ? Number(linkedProp.fields[F.props.sf]).toLocaleString() : '—'} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
        <div style={{ ...card, padding: '16px', marginBottom: 0 }}>
          <div style={secTitle}>Listing Details</div>
          <DetailRow label="Structure" value={fv(f, F.lists.structure)} />
          <DetailRow label="Asking Rate" value={fv(f, F.lists.rate)} />
          <DetailRow label="Comm. Rate" value={f[F.lists.commRate] ? (f[F.lists.commRate]*100).toFixed(2)+'%' : '—'} />
          <DetailRow label="Listing Date" value={fv(f, F.lists.listDate)} />
          <DetailRow label="Expiration" value={fv(f, F.lists.expDate)} />
          <DetailRow label="Co-Broker" value={fv(f, F.lists.coBroker)} />
          <DetailRow label="Current Offer" value={fv(f, F.lists.offer)} />
          <DetailRow label="Offer Status" value={fv(f, F.lists.offerStatus)} />
          <DetailRow label="Buyer / Tenant" value={fv(f, F.lists.buyerTenant)} />
          {f[F.lists.notes] && <div style={{ marginTop: '10px' }}><div style={flbl}>Notes</div><div style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>{f[F.lists.notes]}</div></div>}
        </div>
        <div style={{ ...card, padding: '16px', marginBottom: 0 }}>
          <div style={secTitle}>Property Info</div>
          {linkedProp ? <>
            <DetailRow label="Address" value={fv(linkedProp.fields, F.props.addr)} />
            <DetailRow label="City" value={fv(linkedProp.fields, F.props.city)} />
            <DetailRow label="Zip" value={fv(linkedProp.fields, F.props.zip)} />
            <DetailRow label="Zoning" value={fv(linkedProp.fields, F.props.zoning)} />
            <DetailRow label="Type" value={fv(linkedProp.fields, F.props.type)} />
            <DetailRow label="Owner" value={fv(linkedProp.fields, F.props.ownerName)} />
            <DetailRow label="Owner Entity" value={fv(linkedProp.fields, F.props.entity)} />
            <DetailRow label="Owner Phone" value={fv(linkedProp.fields, F.props.ownerPhone)} />
            <DetailRow label="Owner Email" value={fv(linkedProp.fields, F.props.ownerEmail)} />
          </> : <div style={{ color: '#9ca3af', fontSize: '13px' }}>No property linked</div>}
        </div>
      </div>

      {listDeals.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Linked Deals ({listDeals.length})</div>
          <div style={card}><table style={tbl}><thead><tr><th style={th}>Deal</th><th style={th}>Stage</th><th style={th}>Est. Commission</th><th style={th}>Close Date</th></tr></thead><tbody>{listDeals.map(d=><tr key={d.id}><td style={td}><div style={{fontWeight:500}}>{fv(d.fields,F.deals.name)}</div></td><td style={td}><Badge value={d.fields[F.deals.stage]} /></td><td style={{...td,color:'#c69425'}}>{fmt$(d.fields[F.deals.estComm])}</td><td style={{...td,color:'#6b7280'}}>{fv(d.fields,F.deals.closeDate)}</td></tr>)}</tbody></table></div>
        </div>
      )}

      {listConts.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Contacts</div>
          <div style={card}><table style={tbl}><thead><tr><th style={th}>Name</th><th style={th}>Role</th><th style={th}>Phone</th><th style={th}>Email</th></tr></thead><tbody>{listConts.map(c=><tr key={c.id}><td style={td}><div style={{fontWeight:500}}>{fv(c.fields,F.conts.name)}</div></td><td style={{...td,color:'#6b7280'}}>{fv(c.fields,F.conts.role)}</td><td style={td}>{fv(c.fields,F.conts.phone)}</td><td style={{...td,color:'#6b7280'}}>{fv(c.fields,F.conts.email)}</td></tr>)}</tbody></table></div>
        </div>
      )}

      <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Activity Log ({listActs.length})</div>
      <ActsTable acts={listActs} />

      {modal === 'edit' && <Modal title="Edit Listing" onClose={() => setModal(null)} wide><ListingForm data={listing} props={props} onSave={() => { setModal(null); onRefresh() }} onCancel={() => setModal(null)} /></Modal>}
      {modal === 'activity' && <Modal title="Log Activity" onClose={() => setModal(null)}><ActivityForm props={props} deals={allData.deals} lists={allData.lists} prefillListId={listing.id} onSave={() => { setModal(null); onRefresh() }} onCancel={() => setModal(null)} /></Modal>}
    </div>
  )
}

// ─── Property Detail ──────────────────────────────────────────────────────────
function PropertyDetail({ property, allData, onBack, onRefresh }) {
  const [modal, setModal] = useState(null)
  const { lists, deals, acts, conts } = allData
  const f = property.fields
  const propListings = lists.filter(l => linked(l.fields, F.lists.prop).some(p => p.id === property.id))
  const propDeals = deals.filter(d => linked(d.fields, F.deals.prop).some(p => p.id === property.id))
  const propActs = acts.filter(a => linked(a.fields, F.acts.linkedProp).some(p => p.id === property.id))
  const propConts = conts.filter(c => linked(c.fields, F.conts.linkedProp).some(p => p.id === property.id))

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <button style={btnBack} onClick={onBack}>← Back</button>
        <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'DM Serif Display, serif' }}>{fv(f, F.props.addr)}{fv(f, F.props.city) ? ', ' + fv(f, F.props.city) : ''}</div>
        <Badge value={f[F.props.status]} />
        <button style={{ marginLeft: 'auto', ...btnPrimary }} onClick={() => setModal('activity')}>+ Log Activity</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '16px' }}>
        <StatCard label="Acreage" value={f[F.props.acreage] || '—'} />
        <StatCard label="Building SF" value={f[F.props.sf] ? Number(f[F.props.sf]).toLocaleString() : '—'} />
        <StatCard label="Listings" value={propListings.length} />
        <StatCard label="Deals" value={propDeals.length} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginBottom: '16px' }}>
        <div style={{ ...card, padding: '16px', marginBottom: 0 }}>
          <div style={secTitle}>Property Details</div>
          <DetailRow label="Address" value={fv(f, F.props.addr)} />
          <DetailRow label="City" value={fv(f, F.props.city)} />
          <DetailRow label="Zip" value={fv(f, F.props.zip)} />
          <DetailRow label="Type" value={fv(f, F.props.type)} />
          <DetailRow label="Zoning" value={fv(f, F.props.zoning)} />
          <DetailRow label="Tags" value={fv(f, F.props.tags)} />
          {f[F.props.notes] && <div style={{ marginTop: '10px' }}><div style={flbl}>Notes</div><div style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>{f[F.props.notes]}</div></div>}
        </div>
        <div style={{ ...card, padding: '16px', marginBottom: 0 }}>
          <div style={secTitle}>Ownership</div>
          <DetailRow label="Entity" value={fv(f, F.props.entity)} />
          <DetailRow label="Owner Name" value={fv(f, F.props.ownerName)} />
          <DetailRow label="Owner Phone" value={fv(f, F.props.ownerPhone)} />
          <DetailRow label="Owner Email" value={fv(f, F.props.ownerEmail)} />
        </div>
      </div>

      {propListings.length > 0 && <div style={{ marginBottom: '16px' }}><div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Listings ({propListings.length})</div><div style={card}><table style={tbl}><thead><tr><th style={th}>Name</th><th style={th}>Structure</th><th style={th}>Price</th><th style={th}>Status</th><th style={th}>Est. Comm</th></tr></thead><tbody>{propListings.map(l=><tr key={l.id}><td style={td}><div style={{fontWeight:500}}>{fv(l.fields,F.lists.name)}</div></td><td style={{...td,color:'#6b7280'}}>{fv(l.fields,F.lists.structure)}</td><td style={td}>{fmt$(l.fields[F.lists.price])}</td><td style={td}><Badge value={l.fields[F.lists.status]} /></td><td style={{...td,color:'#c69425'}}>{fmt$(l.fields[F.lists.estComm])}</td></tr>)}</tbody></table></div></div>}
      {propDeals.length > 0 && <div style={{ marginBottom: '16px' }}><div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Deals ({propDeals.length})</div><div style={card}><table style={tbl}><thead><tr><th style={th}>Deal</th><th style={th}>Tenant</th><th style={th}>Stage</th><th style={th}>Est. Comm</th><th style={th}>Close Date</th></tr></thead><tbody>{propDeals.map(d=><tr key={d.id}><td style={td}><div style={{fontWeight:500}}>{fv(d.fields,F.deals.name)}</div></td><td style={td}>{fv(d.fields,F.deals.tenant)}</td><td style={td}><Badge value={d.fields[F.deals.stage]} /></td><td style={{...td,color:'#c69425'}}>{fmt$(d.fields[F.deals.estComm])}</td><td style={{...td,color:'#6b7280'}}>{fv(d.fields,F.deals.closeDate)}</td></tr>)}</tbody></table></div></div>}
      {propConts.length > 0 && <div style={{ marginBottom: '16px' }}><div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Contacts</div><div style={card}><table style={tbl}><thead><tr><th style={th}>Name</th><th style={th}>Role</th><th style={th}>Phone</th><th style={th}>Email</th></tr></thead><tbody>{propConts.map(c=><tr key={c.id}><td style={td}><div style={{fontWeight:500}}>{fv(c.fields,F.conts.name)}</div></td><td style={{...td,color:'#6b7280'}}>{fv(c.fields,F.conts.role)}</td><td style={td}>{fv(c.fields,F.conts.phone)}</td><td style={{...td,color:'#6b7280'}}>{fv(c.fields,F.conts.email)}</td></tr>)}</tbody></table></div></div>}

      <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Activity Log ({propActs.length})</div>
      <ActsTable acts={propActs} />

      {modal === 'activity' && <Modal title="Log Activity" onClose={() => setModal(null)}><ActivityForm props={allData.props} deals={allData.deals} lists={allData.lists} prefillPropId={property.id} onSave={() => { setModal(null); onRefresh() }} onCancel={() => setModal(null)} /></Modal>}
    </div>
  )
}

// ─── Tenant Dashboard ─────────────────────────────────────────────────────────
function TenantDashboard({ tenant, allData, onBack, onRefresh }) {
  const [modal, setModal] = useState(null)
  const { deals, acts, lists } = allData
  const tenantDeals = deals.filter(d => fv(d.fields, F.deals.tenant) === tenant)
  const active = tenantDeals.filter(d => !['Executed','Dead'].includes(fv(d.fields, F.deals.stage)))
  const closed = tenantDeals.filter(d => fv(d.fields, F.deals.stage) === 'Executed')
  const pipeline$ = active.reduce((s,d) => s + (d.fields[F.deals.estComm]||0), 0)
  const closed$ = closed.reduce((s,d) => s + (d.fields[F.deals.estComm]||0), 0)
  const tenantDealIds = new Set(tenantDeals.map(d => d.id))
  const tenantActs = acts.filter(a => linked(a.fields, F.acts.linkedDeal).some(l => tenantDealIds.has(l.id)))

  const months = []
  const now = new Date()
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
    months.push({ label: d.toLocaleString('default', {month:'short', year:'2-digit'}), key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` })
  }
  const byMonth = {}
  tenantDeals.forEach(d => {
    const cd = fv(d.fields, F.deals.closeDate)
    if (!cd) return
    const key = cd.substring(0,7)
    if (!byMonth[key]) byMonth[key] = []
    byMonth[key].push(d)
  })

  const STAGE_ORDER = ['Target Identified','Outreach','LOI Prepared','LOI Submitted','LOI Accepted','Lease Negotiation','Lease Draft','PSA Negotiation','PSA Draft','Executed','Dead']

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
        <button style={btnBack} onClick={onBack}>← Back</button>
        <div style={{ fontSize: '18px', fontWeight: 700, fontFamily: 'DM Serif Display, serif' }}>{tenant}</div>
        <span style={{ fontSize: '12px', color: '#6b7280', background: '#f5f2e8', border: '1px solid #e2dcc8', padding: '2px 8px', borderRadius: '4px' }}>Tenant Rep</span>
        <button style={{ marginLeft: 'auto', ...btnPrimary }} onClick={() => setModal('deal')}>+ New Deal</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '16px' }}>
        <StatCard label="Active Pipeline" value={fmt$(pipeline$)} color="#316828" />
        <StatCard label="Closed Commission" value={fmt$(closed$)} color="#c69425" />
        <StatCard label="Active Deals" value={active.length} />
        <StatCard label="Total Deals" value={tenantDeals.length} />
      </div>

      <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Deal Pipeline</div>
      <div style={{ ...card, marginBottom: '16px' }}>
        <table style={tbl}>
          <thead><tr><th style={th}>Deal</th><th style={th}>Stage</th><th style={th}>Structure</th><th style={th}>Market</th><th style={th}>Est. Commission</th><th style={th}>Close Date</th><th style={th}>CA</th></tr></thead>
          <tbody>{[...tenantDeals].sort((a,b) => STAGE_ORDER.indexOf(fv(a.fields,F.deals.stage)) - STAGE_ORDER.indexOf(fv(b.fields,F.deals.stage))).map(d => (
            <tr key={d.id}>
              <td style={td}><div style={{ fontWeight: 500 }}>{fv(d.fields, F.deals.name)}</div></td>
              <td style={td}><Badge value={d.fields[F.deals.stage]} /></td>
              <td style={{ ...td, color: '#6b7280' }}>{fv(d.fields, F.deals.structure)}</td>
              <td style={{ ...td, color: '#6b7280' }}>{fv(d.fields, F.deals.market)}</td>
              <td style={{ ...td, color: '#c69425', fontWeight: 600 }}>{fmt$(d.fields[F.deals.estComm])}</td>
              <td style={{ ...td, color: '#6b7280' }}>{fv(d.fields, F.deals.closeDate)}</td>
              <td style={td}>{d.fields[F.deals.ca] ? <span style={{ color: '#316828', fontWeight: 700 }}>✓</span> : '—'}</td>
            </tr>
          ))}</tbody>
        </table>
      </div>

      <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>12-Month Commission Calendar</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '8px', marginBottom: '16px' }}>
        {months.map(m => {
          const mDeals = byMonth[m.key] || []
          const total = mDeals.reduce((s,d) => s + (d.fields[F.deals.estComm]||0), 0)
          return (
            <div key={m.key} style={{ background: '#fff', border: '1px solid #e2dcc8', borderRadius: '8px', padding: '8px', minHeight: '60px' }}>
              <div style={{ fontSize: '10px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '4px' }}>{m.label}</div>
              {mDeals.map(d => <div key={d.id} style={{ fontSize: '10px', color: '#316828', background: '#e8f0e9', borderRadius: '3px', padding: '2px 4px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fv(d.fields, F.deals.name)}</div>)}
              {total > 0 && <div style={{ fontSize: '11px', fontWeight: 700, color: '#c69425', marginTop: '4px' }}>{fmt$(total)}</div>}
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Activity Log ({tenantActs.length})</div>
      <ActsTable acts={tenantActs} />

      {modal === 'deal' && <Modal title={`New Deal — ${tenant}`} onClose={() => setModal(null)} wide><DealForm props={allData.props} lists={lists} onSave={() => { setModal(null); onRefresh() }} onCancel={() => setModal(null)} /></Modal>}
    </div>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function CRM() {
  const { user } = useUser()
  const [view, setView] = useState('dashboard')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [modal, setModal] = useState(null)
  const [selected, setSelected] = useState({ listing: null, deal: null, property: null, tenant: null })

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/data')
    const json = await res.json()
    setData(json)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const setView2 = (v) => { setView(v); setSearch(''); setSelected({ listing: null, deal: null, property: null, tenant: null }) }
  const onRefresh = () => fetchData()

  if (!data || loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f0edd8' }}>
      <div style={{ fontSize: '14px', color: '#6b7280' }}>Loading...</div>
    </div>
  )

  const { props, lists, deals, conts, acts } = data
  const q = search.toLowerCase()
  const filt = (recs, fields) => q ? recs.filter(r => fields.some(f => (fv(r.fields, f)||'').toLowerCase().includes(q))) : recs

  // Stats
  const activePipeline = deals.filter(d => !['Executed','Dead'].includes(fv(d.fields, F.deals.stage))).reduce((s,d) => s + (d.fields[F.deals.estComm]||0), 0)
  const closedComm = deals.filter(d => fv(d.fields, F.deals.stage) === 'Executed').reduce((s,d) => s + (d.fields[F.deals.estComm]||0), 0)
  const activeListings = lists.filter(l => fv(l.fields, F.lists.status) === 'Active').length
  const fueDue = acts.filter(a => { const fd = a.fields[F.acts.fuDate]; return fd && !a.fields[F.acts.fuDone] && new Date(fd) <= new Date() }).length

  const VIEWS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'properties', label: 'Properties', count: props.length },
    { id: 'listings', label: 'Listings', count: lists.length },
    { id: 'deals', label: 'Deals', count: deals.length },
    { id: 'contacts', label: 'Contacts', count: conts.length },
    { id: 'activities', label: 'Activities', count: acts.length },
    { id: 'calendar', label: 'Commission Cal.' },
  ]

  const allData = { props, lists, deals, conts, acts }

  // Tenant groups
  const tenants = [...new Set(deals.map(d => fv(d.fields, F.deals.tenant)).filter(Boolean))].sort()

  const renderDetail = () => {
    if (view === 'deals' && selected.deal) return <DealDetail deal={selected.deal} allData={allData} onBack={() => setSelected(s => ({...s, deal:null}))} onRefresh={onRefresh} />
    if (view === 'deals' && selected.tenant) return <TenantDashboard tenant={selected.tenant} allData={allData} onBack={() => setSelected(s => ({...s, tenant:null}))} onRefresh={onRefresh} />
    if (view === 'listings' && selected.listing) return <ListingDetail listing={selected.listing} allData={allData} onBack={() => setSelected(s => ({...s, listing:null}))} onRefresh={onRefresh} />
    if (view === 'properties' && selected.property) return <PropertyDetail property={selected.property} allData={allData} onBack={() => setSelected(s => ({...s, property:null}))} onRefresh={onRefresh} />
    return null
  }

  const detail = renderDetail()

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#f0edd8' }}>
      {/* Sidebar */}
      <div style={{ width: '200px', background: '#fff', borderRight: '1px solid #e2dcc8', display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
        <div style={{ padding: '16px', borderBottom: '1px solid #e2dcc8' }}>
          <div style={{ fontFamily: 'DM Serif Display, serif', fontSize: '16px', color: '#316828' }}>REAT Commercial</div>
          <div style={{ fontSize: '11px', color: '#c69425', marginTop: '2px', letterSpacing: '0.06em', textTransform: 'uppercase' }}>CRM</div>
        </div>
        <nav style={{ flex: 1, padding: '8px 0', overflowY: 'auto' }}>
          {VIEWS.map(v => (
            <div key={v.id} onClick={() => setView2(v.id)} style={{ display: 'flex', alignItems: 'center', padding: '8px 14px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, borderLeft: view === v.id ? '3px solid #c69425' : '3px solid transparent', background: view === v.id ? '#f9f7f0' : 'transparent', color: view === v.id ? '#316828' : '#6b7280' }}>
              {v.label}
              {v.count !== undefined && <span style={{ marginLeft: 'auto', background: view === v.id ? '#f0edd8' : '#f5f2e8', color: view === v.id ? '#316828' : '#9ca3af', fontSize: '11px', padding: '1px 7px', borderRadius: '10px' }}>{v.count}</span>}
            </div>
          ))}
        </nav>
        <div style={{ padding: '12px', borderTop: '1px solid #e2dcc8' }}>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '8px' }}>{user?.firstName} {user?.lastName}</div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #e2dcc8', display: 'flex', alignItems: 'center', gap: '12px', background: '#fff' }}>
          <div style={{ fontSize: '15px', fontWeight: 700 }}>{detail ? '' : VIEWS.find(v=>v.id===view)?.label}</div>
          <input style={{ marginLeft: 'auto', background: '#faf8f0', border: '1px solid #e2dcc8', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', width: '200px', outline: 'none' }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          <button style={btnPrimary} onClick={() => setModal('quickadd')}>+ Add</button>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {detail}

          {/* Dashboard */}
          {!detail && view === 'dashboard' && (
            <div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '12px', marginBottom: '20px' }}>
                <StatCard label="Active Pipeline" value={fmt$(activePipeline)} color="#316828" />
                <StatCard label="Closed Commission" value={fmt$(closedComm)} color="#c69425" />
                <StatCard label="Active Listings" value={activeListings} />
                <StatCard label="Follow-Ups Due" value={fueDue} color={fueDue > 0 ? '#dc2626' : undefined} />
              </div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Recent Deals</div>
              <div style={card}>
                <table style={tbl}>
                  <thead><tr><th style={th}>Deal</th><th style={th}>Tenant</th><th style={th}>Stage</th><th style={th}>Est. Commission</th><th style={th}>Close Date</th></tr></thead>
                  <tbody>{[...deals].reverse().slice(0,8).map(d => <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => { setView('deals'); setSelected(s => ({...s, deal:d})) }}><td style={td}><div style={{fontWeight:500}}>{fv(d.fields,F.deals.name)}</div></td><td style={td}>{fv(d.fields,F.deals.tenant)||'—'}</td><td style={td}><Badge value={d.fields[F.deals.stage]} /></td><td style={{...td,color:'#c69425',fontWeight:600}}>{fmt$(d.fields[F.deals.estComm])}</td><td style={{...td,color:'#6b7280'}}>{fv(d.fields,F.deals.closeDate)||'—'}</td></tr>)}</tbody>
                </table>
              </div>
            </div>
          )}

          {/* Properties */}
          {!detail && view === 'properties' && (
            <div style={card}>
              <table style={tbl}>
                <thead><tr><th style={th}>Address</th><th style={th}>City</th><th style={th}>Type</th><th style={th}>Status</th><th style={th}>Acreage</th><th style={th}>SF</th></tr></thead>
                <tbody>{filt(props,[F.props.addr,F.props.city]).map(r => <tr key={r.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(s => ({...s, property:r}))}><td style={td}><div style={{fontWeight:500}}>{fv(r.fields,F.props.addr)||'—'}</div></td><td style={td}>{fv(r.fields,F.props.city)||'—'}</td><td style={{...td,color:'#6b7280'}}>{fv(r.fields,F.props.type)||'—'}</td><td style={td}><Badge value={r.fields[F.props.status]} /></td><td style={td}>{r.fields[F.props.acreage]||'—'}</td><td style={td}>{r.fields[F.props.sf]?Number(r.fields[F.props.sf]).toLocaleString():'—'}</td></tr>)}</tbody>
              </table>
            </div>
          )}

          {/* Listings */}
          {!detail && view === 'listings' && (
            <div style={card}>
              <table style={tbl}>
                <thead><tr><th style={th}>Listing</th><th style={th}>Structure</th><th style={th}>Asking Price</th><th style={th}>Status</th><th style={th}>Offer Status</th><th style={th}>Est. Commission</th></tr></thead>
                <tbody>{filt(lists,[F.lists.name,F.lists.market]).map(l => <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(s => ({...s, listing:l}))}><td style={td}><div style={{fontWeight:500}}>{fv(l.fields,F.lists.name)||'—'}</div><div style={{fontSize:'11px',color:'#9ca3af'}}>{fv(l.fields,F.lists.market)}</div></td><td style={{...td,color:'#6b7280'}}>{fv(l.fields,F.lists.structure)||'—'}</td><td style={td}>{fmt$(l.fields[F.lists.price])}</td><td style={td}><Badge value={l.fields[F.lists.status]} /></td><td style={td}><Badge value={l.fields[F.lists.offerStatus]} /></td><td style={{...td,color:'#c69425',fontWeight:600}}>{fmt$(l.fields[F.lists.estComm])}</td></tr>)}</tbody>
              </table>
            </div>
          )}

          {/* Deals */}
          {!detail && view === 'deals' && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>Tenant Rep Pipelines</div>
              {tenants.map(tenant => {
                const tDeals = deals.filter(d => fv(d.fields, F.deals.tenant) === tenant)
                const tActive = tDeals.filter(d => !['Executed','Dead'].includes(fv(d.fields, F.deals.stage)))
                const tPipe = tActive.reduce((s,d) => s + (d.fields[F.deals.estComm]||0), 0)
                return (
                  <div key={tenant} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#316828', cursor: 'pointer', textDecoration: 'underline', textDecorationColor: '#c69425' }} onClick={() => setSelected(s => ({...s, tenant}))}>{tenant}</div>
                      <span style={{ fontSize: '12px', color: '#9ca3af' }}>{tActive.length} active · {fmt$(tPipe)}</span>
                    </div>
                    <div style={card}>
                      <table style={tbl}>
                        <thead><tr><th style={th}>Deal</th><th style={th}>Stage</th><th style={th}>Structure</th><th style={th}>Est. Commission</th><th style={th}>Close Date</th></tr></thead>
                        <tbody>{tDeals.map(d => <tr key={d.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(s => ({...s, deal:d}))}><td style={td}><div style={{fontWeight:500}}>{fv(d.fields,F.deals.name)||'—'}</div></td><td style={td}><Badge value={d.fields[F.deals.stage]} /></td><td style={{...td,color:'#6b7280'}}>{fv(d.fields,F.deals.structure)||'—'}</td><td style={{...td,color:'#c69425',fontWeight:600}}>{fmt$(d.fields[F.deals.estComm])}</td><td style={{...td,color:'#6b7280'}}>{fv(d.fields,F.deals.closeDate)||'—'}</td></tr>)}</tbody>
                      </table>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Contacts */}
          {!detail && view === 'contacts' && (
            <div style={card}>
              <table style={tbl}>
                <thead><tr><th style={th}>Name</th><th style={th}>Company</th><th style={th}>Role</th><th style={th}>Phone</th><th style={th}>Email</th></tr></thead>
                <tbody>{filt(conts,[F.conts.name,F.conts.company]).map(c => <tr key={c.id}><td style={td}><div style={{fontWeight:500}}>{fv(c.fields,F.conts.name)||'—'}</div></td><td style={td}>{fv(c.fields,F.conts.company)||'—'}</td><td style={{...td,color:'#6b7280'}}>{fv(c.fields,F.conts.role)||'—'}</td><td style={td}>{fv(c.fields,F.conts.phone)||'—'}</td><td style={{...td,color:'#6b7280'}}>{fv(c.fields,F.conts.email)||'—'}</td></tr>)}</tbody>
              </table>
            </div>
          )}

          {/* Activities */}
          {!detail && view === 'activities' && <ActsTable acts={filt(acts,[F.acts.desc])} />}

          {/* Calendar */}
          {!detail && view === 'calendar' && (() => {
            const months = []
            const now = new Date()
            for (let i = 0; i < 18; i++) {
              const d = new Date(now.getFullYear(), now.getMonth() + i, 1)
              months.push({ label: d.toLocaleString('default', {month:'short', year:'numeric'}), key: `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}` })
            }
            const byMonth = {}
            deals.forEach(d => {
              const cd = fv(d.fields, F.deals.closeDate)
              if (!cd) return
              const key = cd.substring(0,7)
              if (!byMonth[key]) byMonth[key] = []
              byMonth[key].push(d)
            })
            return (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '10px' }}>
                {months.map(m => {
                  const mDeals = byMonth[m.key] || []
                  const total = mDeals.reduce((s,d) => s + (d.fields[F.deals.estComm]||0), 0)
                  return (
                    <div key={m.key} style={{ background: '#fff', border: '1px solid #e2dcc8', borderRadius: '10px', padding: '10px', minHeight: '80px' }}>
                      <div style={{ fontSize: '11px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', marginBottom: '6px' }}>{m.label}</div>
                      {mDeals.map(d => <div key={d.id} style={{ fontSize: '10px', color: '#316828', background: '#e8f0e9', borderRadius: '3px', padding: '2px 5px', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fv(d.fields, F.deals.name)}</div>)}
                      {total > 0 && <div style={{ fontSize: '12px', fontWeight: 700, color: '#c69425', marginTop: '6px' }}>{fmt$(total)}</div>}
                    </div>
                  )
                })}
              </div>
            )
          })()}
        </div>
      </div>

      {/* Quick Add Modal */}
      {modal === 'quickadd' && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={e => e.target === e.currentTarget && setModal(null)}>
          <div style={{ background: '#fff', borderRadius: '10px', overflow: 'hidden', boxShadow: '0 8px 30px rgba(0,0,0,0.15)', minWidth: '160px' }}>
            {[['deal','Deal'],['listing','Listing'],['activity','Activity']].map(([key, label]) => (
              <div key={key} style={{ padding: '12px 18px', cursor: 'pointer', fontSize: '13px', fontWeight: 500, borderBottom: '1px solid #f5f2e8' }}
                onMouseEnter={e => e.currentTarget.style.background='#f9f7f0'}
                onMouseLeave={e => e.currentTarget.style.background='#fff'}
                onClick={() => setModal(key)}>{label}</div>
            ))}
          </div>
        </div>
      )}
      {modal === 'deal' && <Modal title="New Deal" onClose={() => setModal(null)} wide><DealForm props={props} lists={lists} onSave={() => { setModal(null); onRefresh() }} onCancel={() => setModal(null)} /></Modal>}
      {modal === 'listing' && <Modal title="New Listing" onClose={() => setModal(null)} wide><ListingForm props={props} onSave={() => { setModal(null); onRefresh() }} onCancel={() => setModal(null)} /></Modal>}
      {modal === 'activity' && <Modal title="Log Activity" onClose={() => setModal(null)}><ActivityForm props={props} deals={deals} lists={lists} onSave={() => { setModal(null); onRefresh() }} onCancel={() => setModal(null)} /></Modal>}
    </div>
  )
}
