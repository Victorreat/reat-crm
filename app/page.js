'use client'
import { useUser, UserButton } from '@clerk/nextjs'
import React, { useState, useEffect, useCallback } from 'react'

// ─── Field Names (Airtable REST API returns field names not IDs) ───────────────
const F = {
  props: {
    addr:'Address', city:'City', state:'State', zip:'Zip',
    attrs:'Property Attributes', acreage:'Acreage', sf:'Building SF', zoning:'Zoning',
    status:'Prospecting Status', source:'Property Source', tags:'Tags',
    entity:'Ownership Entity', ownerName:'Owner Name', ownerPhone:'Owner Phone', ownerEmail:'Owner Email',
    confirmed:'Contact Confirmed', attempts:'Outreach Attempts',
    firstOutreach:'First Outreach Date', lastOutreach:'Last Outreach Date',
    driveFolder:'Drive Folder', notes:'Notes',
    listings:'Listings', deals:'Deals', contacts:'Contacts', acts:'Activties',
  },
  lists: {
    name:'Listing Name', notes:'Notes',
    status:'Listing Status', type:'Listing Type', price:'Asking Price',
    rate:'Asking Rate', commRate:'Commission Rate', estComm:'Est. Commission',
    agreeDate:'Listing Agreement Date', expDate:'Listing Expiration Date',
    coListBroker:'Co-List Broker', coListFee:'Co-List Fee',
    offerStatus:'Offer Status', buyerTenant:'Buyer / Tenant',
    driveFolder:'Drive Folder', prop:'Property',
    contacts:'Contacts', acts:'Activities', deals:'Deals',
  },
  deals: {
    name:'Deal Name', notes:'Notes',
    type:'Deal Type', clientName:'Client Name', clientEntity:'Client Entity',
    stage:'Deal Stage', structure:'Deal Structure', value:'Deal Value',
    commRate:'Commission Rate', estComm:'Est. Commission', referralFee:'Referral Fee',
    ca:'Commission Agreement Executed', agencyDisclosure:'Agency Disclosure Executed',
    buyerTenant:'Buyer/Tenant', counterpart:'Counterpart Contact',
    driveFolder:'Drive Folder', prop:'Property', contacts:'Contacts',
    acts:'Activities', closeDate:'Projected Close Date', linkedListing:'Linked Listing',
  },
  conts: {
    firstName:'First Name', lastName:'Last Name', company:'Company', title:'Title',
    role:'Role', phone:'Phone', email:'Email', lastContacted:'Last Contacted',
    linkedProp:'Linked Property', linkedListing:'Linked Listing', linkedDeal:'Linked Deal',
    acts:'Activities', notes:'Notes',
  },
  acts: {
    desc:'Activity', notes:'Notes', date:'Date',
    type:'Type', outcome:'Outcome', fuDate:'Follow-Up Date',
    fuAction:'Follow-Up Action', fuDone:'Follow-Up Done',
    linkedProp:'Linked Property', linkedListing:'Linked Listing',
    linkedDeal:'Linked Deal', linkedContact:'Linked Contact',
    capture:'Capture', status:'Status', nextAction:'Next Action',
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const fmt$ = n => n ? '$' + Number(n).toLocaleString('en-US', {maximumFractionDigits:0}) : '—'
const fmtPct = n => n ? (n * 100).toFixed(2) + '%' : '—'
const contName = f => [f?.['First Name'], f?.['Last Name']].filter(Boolean).join(' ') || '—'
const fv = (fields, key) => {
  const v = fields?.[key]
  if (v === null || v === undefined || v === '') return ''
  if (Array.isArray(v)) return v.map(x => typeof x === 'object' ? (x.name || x.id) : String(x)).join(', ')
  if (typeof v === 'object' && v.name) return v.name
  return String(v)
}
// REST API returns linked records as array of record ID strings e.g. ["recXXX"]
const linked = (fields, key) => {
  const v = fields?.[key]
  if (!v || !Array.isArray(v)) return []
  // Normalize to array of {id} objects regardless of format
  return v.map(x => typeof x === 'object' ? x : { id: x })
}

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
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json
}
async function apiUpdate(table, id, fields) {
  const res = await fetch('/api/records', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ table, id, fields }) })
  const json = await res.json()
  if (json.error) throw new Error(json.error)
  return json
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

function SearchInput({ label, records, nameField, subField, onSelect, placeholder, initialValue }) {
  const [q, setQ] = useState(initialValue || '')
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
const btnSmall = { background: '#f5f2e8', color: '#374151', border: '1px solid #e2dcc8', borderRadius: '5px', padding: '3px 8px', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }

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
function DealForm({ data, props, lists, onSave, onCancel, prefillListId, prefillPropId }) {
  const editing = !!data
  const g = f => data ? (data.fields[f] !== undefined ? data.fields[f] : '') : ''
  const gs = f => data ? (fv(data.fields, f) || '') : ''

  // Resolve existing linked records when editing
  const existingPropId = editing ? (linked(data.fields, F.deals.prop)[0]?.id || null) : null
  const existingListId = editing ? (linked(data.fields, F.deals.linkedListing)[0]?.id || null) : null
  const existingProp = existingPropId ? props.find(p => p.id === existingPropId) : null
  const existingList = existingListId ? lists.find(l => l.id === existingListId) : null

  const [name, setName] = useState(gs(F.deals.name))
  const [dealType, setDealType] = useState(gs(F.deals.type))
  const [clientName, setClientName] = useState(gs(F.deals.clientName))
  const [clientEntity, setClientEntity] = useState(gs(F.deals.clientEntity))
  const [stage, setStage] = useState(gs(F.deals.stage) || 'LOI Prepared')
  const [structure, setStructure] = useState(gs(F.deals.structure))
  const [buyerTenant, setBuyerTenant] = useState(gs(F.deals.buyerTenant))
  const [counterpart, setCounterpart] = useState(gs(F.deals.counterpart))
  const [referralFee, setReferralFee] = useState(g(F.deals.referralFee) || '')
  const [agencyDisclosure, setAgencyDisclosure] = useState(!!g(F.deals.agencyDisclosure))
  const [commRate, setCommRate] = useState(g(F.deals.commRate) ? (g(F.deals.commRate)*100).toFixed(2) : '')
  const [closeDate, setCloseDate] = useState(gs(F.deals.closeDate))
  const [ca, setCa] = useState(!!g(F.deals.ca))
  const [notes, setNotes] = useState(g(F.deals.notes) || '')
  const [propId, setPropId] = useState(existingPropId || (typeof prefillPropId === 'string' ? prefillPropId : null))
  const [listId, setListId] = useState(existingListId || (typeof prefillListId === 'string' ? prefillListId : null))
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
      'Deal Name': name,
      'Deal Type': dealType || undefined,
      'Client Name': clientName || undefined,
      'Client Entity': clientEntity || undefined,
      'Deal Stage': stage,
      'Deal Structure': structure || undefined,
      'Deal Value': dealValue > 0 ? dealValue : undefined,
      'Commission Rate': commRateN > 0 ? commRateN / 100 : undefined,
      'Est. Commission': estComm > 0 ? estComm : undefined,
      'Referral Fee': referralFee ? parseFloat(referralFee) : undefined,
      'Projected Close Date': closeDate || undefined,
      'Commission Agreement Executed': ca,
      'Agency Disclosure Executed': agencyDisclosure,
      'Buyer/Tenant': buyerTenant || undefined,
      'Counterpart Contact': counterpart || undefined,
      'Notes': notes || undefined,
      'Property': (typeof propId === 'string' && propId) ? [propId] : undefined,
      'Linked Listing': (typeof listId === 'string' && listId) ? [listId] : undefined,
    }
    const clean = Object.fromEntries(Object.entries(fields).filter(([,v]) => v !== undefined))
    console.log('[DealForm] saving clean payload:', JSON.stringify(clean, null, 2))
    try {
      if (editing) await apiUpdate('deals', data.id, clean)
      else await apiCreate('deals', clean)
      setSaving(false); onSave()
    } catch(err) {
      setSaving(false)
      alert('Save failed: ' + err.message)
    }
  }

  return (
    <div>
      <SearchInput label="Property" records={props} nameField={F.props.addr} subField={F.props.city} onSelect={setPropId} placeholder="Search property..." initialValue={existingProp ? fv(existingProp.fields, F.props.addr) : ''} />
      <SearchInput label="Linked Listing" records={lists} nameField={F.lists.name} subField={F.lists.name} onSelect={setListId} placeholder="Search listings..." initialValue={existingList ? fv(existingList.fields, F.lists.name) : ''} />
      <div style={fgrp}><label style={flbl}>Deal Name *</label><input style={inp} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. 7 Brew – Medina" /></div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Deal Type</label><select style={inp} value={dealType} onChange={e=>setDealType(e.target.value)}><option value="">Select...</option>{['Tenant Rep','Listing Rep','Dual Agency','Referral','Referee'].map(t=><option key={t}>{t}</option>)}</select></div>
        <div style={fgrp}><label style={flbl}>Stage</label><select style={inp} value={stage} onChange={e=>setStage(e.target.value)}>{['LOI Prepared','LOI Negotiation','LOI Submitted','LOI Accepted','Lease Negotiation','Lease Draft','PSA Negotiation','PSA Draft','Executed','Dead'].map(s=><option key={s}>{s}</option>)}</select></div>
      </div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Client Name</label><select style={inp} value={clientName} onChange={e=>setClientName(e.target.value)}><option value="">Select...</option>{['7 Brew','Cricket Wireless',"Portillo's",'Other'].map(c=><option key={c}>{c}</option>)}</select></div>
        <div style={fgrp}><label style={flbl}>Client Entity</label><input style={inp} value={clientEntity} onChange={e=>setClientEntity(e.target.value)} /></div>
      </div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Structure</label><select style={inp} value={structure} onChange={e=>setStructure(e.target.value)}><option value="">Select...</option><option>Lease</option><option>Ground Lease</option><option>Purchase</option></select></div>
        <div style={fgrp}><label style={flbl}>Referral Fee $</label><input style={inp} type="number" value={referralFee} onChange={e=>setReferralFee(e.target.value)} /></div>
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
      {estComm > 0 && <div style={{ background:"#f0fdf4", border:"1px solid #bbf7d0", borderRadius:"8px", padding:"10px 14px", marginBottom:"10px" }}><span style={{ fontSize: '12px', color: '#316828', fontWeight: 500 }}>Est. Commission</span><span style={{ fontSize: '18px', fontWeight: 700, color: '#316828' }}>{fmt$(estComm)}</span></div>}
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Buyer / Tenant</label><input style={inp} value={buyerTenant} onChange={e=>setBuyerTenant(e.target.value)} /></div>
        <div style={fgrp}><label style={flbl}>Counterpart Contact</label><input style={inp} value={counterpart} onChange={e=>setCounterpart(e.target.value)} /></div>
      </div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>CA Executed</label><div style={{ paddingTop: '6px' }}><input type="checkbox" checked={ca} onChange={e=>setCa(e.target.checked)} style={{ marginRight: '6px' }} /><span style={{ fontSize: '13px' }}>CA Signed</span></div></div>
        <div style={fgrp}><label style={flbl}>Agency Disclosure</label><div style={{ paddingTop: '6px' }}><input type="checkbox" checked={agencyDisclosure} onChange={e=>setAgencyDisclosure(e.target.checked)} style={{ marginRight: '6px' }} /><span style={{ fontSize: '13px' }}>Disclosure Executed</span></div></div>
      </div>
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
  const g = f => data?.fields?.[f] ?? ''
  const [name, setName] = useState(g(F.lists.name))
  const [type, setType] = useState(fv(data?.fields, F.lists.type) || '')
  const [status, setStatus] = useState(fv(data?.fields, F.lists.status) || 'Active')
  const [price, setPrice] = useState(g(F.lists.price) || '')
  const [rate, setRate] = useState(g(F.lists.rate) || '')
  const [commRate, setCommRate] = useState(g(F.lists.commRate) ? (g(F.lists.commRate)*100).toFixed(2) : '')
  const [agreeDate, setAgreeDate] = useState(g(F.lists.agreeDate))
  const [expDate, setExpDate] = useState(g(F.lists.expDate))
  const [coListBroker, setCoListBroker] = useState(g(F.lists.coListBroker))
  const [coListFee, setCoListFee] = useState(g(F.lists.coListFee) ? (g(F.lists.coListFee)*100).toFixed(2) : '')
  const [offerStatus, setOfferStatus] = useState(fv(data?.fields, F.lists.offerStatus) || '')
  const [buyerTenant, setBuyerTenant] = useState(g(F.lists.buyerTenant))
  const [driveFolder, setDriveFolder] = useState(g(F.lists.driveFolder) || '')
  const [notes, setNotes] = useState(g(F.lists.notes) || '')
  const [propId, setPropId] = useState(null)
  const [saving, setSaving] = useState(false)
  const estComm = price && commRate ? parseFloat(price) * parseFloat(commRate) / 100 : g(F.lists.estComm) || 0

  const handleSave = async () => {
    if (!name) return alert('Listing name required')
    setSaving(true)
    try {
      const fields = {
        'Listing Name': name, 'Listing Type': type || undefined, 'Listing Status': status,
        'Asking Price': parseFloat(price) || undefined, 'Asking Rate': rate || undefined,
        'Commission Rate': parseFloat(commRate) ? parseFloat(commRate)/100 : undefined,
        'Est. Commission': estComm || undefined,
        'Listing Agreement Date': agreeDate || undefined, 'Listing Expiration Date': expDate || undefined,
        'Co-List Broker': coListBroker || undefined,
        'Co-List Fee': parseFloat(coListFee) ? parseFloat(coListFee)/100 : undefined,
        'Offer Status': offerStatus || undefined, 'Buyer / Tenant': buyerTenant || undefined,
        'Drive Folder': driveFolder || undefined,
        'Notes': notes || undefined,
        ...(propId ? { 'Property': [propId] } : {}),
      }
      const clean = Object.fromEntries(Object.entries(fields).filter(([,v]) => v !== undefined))
      if (editing) await apiUpdate('lists', data.id, clean)
      else await apiCreate('lists', clean)
      setSaving(false); onSave()
    } catch(err) { setSaving(false); alert('Save failed: ' + err.message) }
  }

  return (
    <div>
      <SearchInput label="Property" records={props} nameField={F.props.addr} subField={F.props.city} onSelect={setPropId} placeholder="Search property..." />
      <div style={fgrp}><label style={flbl}>Listing Name *</label><input style={inp} value={name} onChange={e=>setName(e.target.value)} placeholder="e.g. 960 N Leavitt – Amherst" /></div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Listing Type</label><select style={inp} value={type} onChange={e=>setType(e.target.value)}><option value="">Select...</option>{['Sale','Lease','Sale & Lease'].map(t=><option key={t}>{t}</option>)}</select></div>
        <div style={fgrp}><label style={flbl}>Listing Status</label><select style={inp} value={status} onChange={e=>setStatus(e.target.value)}>{['Active','Under Contract','Closed','Expired','Withdrawn'].map(s=><option key={s}>{s}</option>)}</select></div>
      </div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Asking Price $</label><input style={inp} type="number" value={price} onChange={e=>setPrice(e.target.value)} /></div>
        <div style={fgrp}><label style={flbl}>Asking Rate</label><input style={inp} value={rate} onChange={e=>setRate(e.target.value)} placeholder="e.g. $18/SF NNN" /></div>
      </div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Commission Rate %</label><input style={inp} type="number" step="0.1" value={commRate} onChange={e=>setCommRate(e.target.value)} /></div>
        <div style={fgrp}><label style={flbl}>Offer Status</label><select style={inp} value={offerStatus} onChange={e=>setOfferStatus(e.target.value)}><option value="">Select...</option>{['None','LOI Received','Countered','Accepted','Dead'].map(s=><option key={s}>{s}</option>)}</select></div>
      </div>
      {estComm > 0 && (
        <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'8px', padding:'10px 14px', marginBottom:'10px' }}>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'8px' }}>
            <div><div style={{ fontSize:'11px', color:'#6b7280' }}>Gross Commission</div><div style={{ fontWeight:700 }}>{fmt$(estComm)}</div></div>
            <div><div style={{ fontSize:'11px', color:'#6b7280' }}>Your 80%</div><div style={{ fontWeight:700, color:'#316828' }}>{fmt$(estComm*0.8)}</div></div>
            <div><div style={{ fontSize:'11px', color:'#6b7280' }}>REAT 20%</div><div style={{ fontWeight:700, color:'#c69425' }}>{fmt$(estComm*0.2)}</div></div>
          </div>
        </div>
      )}
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Listing Agreement Date</label><input style={inp} type="date" value={agreeDate} onChange={e=>setAgreeDate(e.target.value)} /></div>
        <div style={fgrp}><label style={flbl}>Expiration Date</label><input style={inp} type="date" value={expDate} onChange={e=>setExpDate(e.target.value)} /></div>
      </div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Co-List Broker</label><input style={inp} value={coListBroker} onChange={e=>setCoListBroker(e.target.value)} /></div>
        <div style={fgrp}><label style={flbl}>Co-List Fee %</label><input style={inp} type="number" step="0.1" value={coListFee} onChange={e=>setCoListFee(e.target.value)} /></div>
      </div>
      <div style={fgrp}><label style={flbl}>Buyer / Tenant</label><input style={inp} value={buyerTenant} onChange={e=>setBuyerTenant(e.target.value)} /></div>
      <div style={fgrp}><label style={flbl}>Drive Folder URL</label><input style={inp} type="url" value={driveFolder} onChange={e=>setDriveFolder(e.target.value)} placeholder="https://drive.google.com/..." /></div>
      <div style={fgrp}><label style={flbl}>Notes</label><textarea style={{...inp,minHeight:'70px',resize:'vertical'}} value={notes} onChange={e=>setNotes(e.target.value)} /></div>
      <div style={{display:'flex',gap:'8px',justifyContent:'flex-end',marginTop:'12px',paddingTop:'12px',borderTop:'1px solid #e2dcc8'}}>
        <button style={btnSecondary} onClick={onCancel}>Cancel</button>
        <button style={{...btnPrimary,opacity:saving?0.6:1}} onClick={handleSave} disabled={saving}>{saving?'Saving...':editing?'Save Changes':'Save Listing'}</button>
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
  const [propId, setPropId] = useState(typeof prefillPropId === 'string' ? prefillPropId : null)
  const [dealId, setDealId] = useState(typeof prefillDealId === 'string' ? prefillDealId : null)
  const [listId, setListId] = useState(typeof prefillListId === 'string' ? prefillListId : null)
  const [saving, setSaving] = useState(false)
  const handleSave = async () => {
    if (!desc) return alert('Activity required')
    setSaving(true)
    const fields = {
      'Activity': desc,
      'Type': type || undefined,
      'Date': date || undefined,
      'Outcome': outcome || undefined,
      'Follow-Up Date': fuDate || undefined,
      'Follow-Up Action': fuAction || undefined,
      'Notes': notes || undefined,
      ...(propId ? { 'Linked Property': [propId] } : {}),
      ...(dealId ? { 'Linked Deal': [dealId] } : {}),
      ...(listId ? { 'Linked Listing': [listId] } : {}),
    }
    const clean = Object.fromEntries(Object.entries(fields).filter(([,v]) => v !== undefined))
    console.log('Saving activity:', clean)
    try {
      await apiCreate('acts', clean)
      setSaving(false); onSave()
    } catch(err) {
      setSaving(false)
      alert('Save failed: ' + err.message)
    }
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
      <SearchInput label="Linked Deal" records={deals} nameField={F.deals.name} subField={F.deals.stage} onSelect={setDealId} placeholder="Search deals..." />
      <SearchInput label="Linked Listing" records={lists} nameField={F.lists.name} subField={F.lists.name} onSelect={setListId} placeholder="Search listings..." />
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
          <DetailRow label="Tenant / Client" value={fv(f, F.deals.clientName)} />
          <DetailRow label="Structure" value={fv(f, F.deals.structure)} />
          <DetailRow label="Deal Type" value={fv(f, F.deals.type)} />
          <DetailRow label="CA Executed" value={f[F.deals.ca] ? '✓ Yes' : 'No'} />
          <DetailRow label="Client Entity" value={fv(f, F.deals.clientEntity)} />
          <DetailRow label="Counterpart" value={fv(f, F.deals.counterpart)} />
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
              <tbody>{dealConts.map(c => <tr key={c.id}><td style={td}><div style={{ fontWeight: 500 }}>{contName(c.fields)}</div></td><td style={{ ...td, color: '#6b7280' }}>{fv(c.fields, F.conts.role)}</td><td style={td}>{fv(c.fields, F.conts.phone)}</td><td style={{ ...td, color: '#6b7280' }}>{fv(c.fields, F.conts.email)}</td></tr>)}</tbody>
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
          <button style={btnSecondary} onClick={() => setModal('deal')}>+ New Deal</button>
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
          <DetailRow label="Structure" value={fv(f, F.lists.type)} />
          <DetailRow label="Asking Rate" value={fv(f, F.lists.rate)} />
          <DetailRow label="Comm. Rate" value={f[F.lists.commRate] ? (f[F.lists.commRate]*100).toFixed(2)+'%' : '—'} />
          <DetailRow label="Agreement Date" value={fv(f, F.lists.agreeDate)} />
          <DetailRow label="Expiration" value={fv(f, F.lists.expDate)} />
          <DetailRow label="Co-List Broker" value={fv(f, F.lists.coListBroker)} />
          <DetailRow label="Offer Status" value={fv(f, F.lists.offerStatus)} />
          <DetailRow label="Buyer / Tenant" value={fv(f, F.lists.buyerTenant)} />
          {f[F.lists.driveFolder] && <div style={{ marginTop: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span style={flbl}>Drive Folder</span><a href={f[F.lists.driveFolder]} target="_blank" rel="noopener noreferrer" style={{ fontSize: '13px', color: '#1d4ed8' }}>Open ↗</a></div>}
          {f[F.lists.notes] && <div style={{ marginTop: '10px' }}><div style={flbl}>Notes</div><div style={{ fontSize: '13px', whiteSpace: 'pre-wrap' }}>{f[F.lists.notes]}</div></div>}
        </div>
        <div style={{ ...card, padding: '16px', marginBottom: 0 }}>
          <div style={secTitle}>Property Info</div>
          {linkedProp ? <>
            <DetailRow label="Address" value={fv(linkedProp.fields, F.props.addr)} />
            <DetailRow label="City" value={fv(linkedProp.fields, F.props.city)} />
            <DetailRow label="Zip" value={fv(linkedProp.fields, F.props.zip)} />
            <DetailRow label="Zoning" value={fv(linkedProp.fields, F.props.zoning)} />
            <DetailRow label="Type" value={fv(linkedProp.fields, F.props.attrs)} />
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
          <div style={card}><table style={tbl}><thead><tr><th style={th}>Name</th><th style={th}>Role</th><th style={th}>Phone</th><th style={th}>Email</th></tr></thead><tbody>{listConts.map(c=><tr key={c.id}><td style={td}><div style={{fontWeight:500}}>{contName(c.fields)}</div></td><td style={{...td,color:'#6b7280'}}>{fv(c.fields,F.conts.role)}</td><td style={td}>{fv(c.fields,F.conts.phone)}</td><td style={{...td,color:'#6b7280'}}>{fv(c.fields,F.conts.email)}</td></tr>)}</tbody></table></div>
        </div>
      )}

      <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Activity Log ({listActs.length})</div>
      <ActsTable acts={listActs} />

      {modal === 'edit' && <Modal title="Edit Listing" onClose={() => setModal(null)} wide><ListingForm data={listing} props={props} onSave={() => { setModal(null); onRefresh() }} onCancel={() => setModal(null)} /></Modal>}
      {modal === 'deal' && <Modal title="New Deal" onClose={() => setModal(null)} wide><DealForm props={props} lists={allData.lists} prefillListId={listing.id} onSave={() => { setModal(null); onRefresh() }} onCancel={() => setModal(null)} /></Modal>}
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
          <DetailRow label="Type" value={fv(f, F.props.attrs)} />
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

      {propListings.length > 0 && <div style={{ marginBottom: '16px' }}><div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Listings ({propListings.length})</div><div style={card}><table style={tbl}><thead><tr><th style={th}>Name</th><th style={th}>Structure</th><th style={th}>Price</th><th style={th}>Status</th><th style={th}>Est. Comm</th></tr></thead><tbody>{propListings.map(l=><tr key={l.id}><td style={td}><div style={{fontWeight:500}}>{fv(l.fields,F.lists.name)}</div></td><td style={{...td,color:'#6b7280'}}>{fv(l.fields,F.lists.type)}</td><td style={td}>{fmt$(l.fields[F.lists.price])}</td><td style={td}><Badge value={l.fields[F.lists.status]} /></td><td style={{...td,color:'#c69425'}}>{fmt$(l.fields[F.lists.estComm])}</td></tr>)}</tbody></table></div></div>}
      {propDeals.length > 0 && <div style={{ marginBottom: '16px' }}><div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Deals ({propDeals.length})</div><div style={card}><table style={tbl}><thead><tr><th style={th}>Deal</th><th style={th}>Tenant</th><th style={th}>Stage</th><th style={th}>Est. Comm</th><th style={th}>Close Date</th></tr></thead><tbody>{propDeals.map(d=><tr key={d.id}><td style={td}><div style={{fontWeight:500}}>{fv(d.fields,F.deals.name)}</div></td><td style={td}>{fv(d.fields,F.deals.clientName)}</td><td style={td}><Badge value={d.fields[F.deals.stage]} /></td><td style={{...td,color:'#c69425'}}>{fmt$(d.fields[F.deals.estComm])}</td><td style={{...td,color:'#6b7280'}}>{fv(d.fields,F.deals.closeDate)}</td></tr>)}</tbody></table></div></div>}
      {propConts.length > 0 && <div style={{ marginBottom: '16px' }}><div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '8px' }}>Contacts</div><div style={card}><table style={tbl}><thead><tr><th style={th}>Name</th><th style={th}>Role</th><th style={th}>Phone</th><th style={th}>Email</th></tr></thead><tbody>{propConts.map(c=><tr key={c.id}><td style={td}><div style={{fontWeight:500}}>{contName(c.fields)}</div></td><td style={{...td,color:'#6b7280'}}>{fv(c.fields,F.conts.role)}</td><td style={td}>{fv(c.fields,F.conts.phone)}</td><td style={{...td,color:'#6b7280'}}>{fv(c.fields,F.conts.email)}</td></tr>)}</tbody></table></div></div>}

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
  const tenantDeals = deals.filter(d => fv(d.fields, F.deals.clientName) === tenant)
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

  const STAGE_ORDER = ['LOI Prepared','LOI Negotiation','LOI Submitted','LOI Accepted','Lease Negotiation','Lease Draft','PSA Negotiation','PSA Draft','Executed','Dead']

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
              <td style={{ ...td, color: '#6b7280' }}>{fv(d.fields, F.deals.type)||'—'}</td>
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


// ─── Property Form ────────────────────────────────────────────────────────────
function PropertyForm({ data, onSave, onCancel }) {
  const editing = !!data
  const g = f => data?.fields?.[f] || ''
  const [addr, setAddr] = useState(g('Address'))
  const [city, setCity] = useState(g('City'))
  const [state, setState] = useState(g('State') || 'OH')
  const [zip, setZip] = useState(g('Zip'))
  const [attrs, setAttrs] = useState(fv(data?.fields, F.props.attrs) || '')
  const [acreage, setAcreage] = useState(g('Acreage'))
  const [sf, setSf] = useState(g('Building SF'))
  const [zoning, setZoning] = useState(g('Zoning'))
  const [status, setStatus] = useState(g('Prospecting Status') || 'New')
  const [entity, setEntity] = useState(g('Ownership Entity'))
  const [ownerName, setOwnerName] = useState(g('Owner Name'))
  const [ownerPhone, setOwnerPhone] = useState(g('Owner Phone'))
  const [ownerEmail, setOwnerEmail] = useState(g('Owner Email'))
  const [notes, setNotes] = useState(g('Notes'))
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!addr) return alert('Address required')
    setSaving(true)
    const fields = {
      'Address': addr, 'City': city||undefined, 'State': state||undefined,
      'Zip': zip||undefined,
      'Property Attributes': attrs||undefined,
      'Acreage': acreage ? parseFloat(acreage) : undefined,
      'Building SF': sf ? parseInt(sf) : undefined,
      'Zoning': zoning||undefined, 'Prospecting Status': status,
      'Ownership Entity': entity||undefined, 'Owner Name': ownerName||undefined,
      'Owner Phone': ownerPhone||undefined, 'Owner Email': ownerEmail||undefined,
      'Notes': notes||undefined,
    }
    const clean = Object.fromEntries(Object.entries(fields).filter(([,v]) => v !== undefined))
    try {
      if (editing) await apiUpdate('props', data.id, clean)
      else await apiCreate('props', clean)
      setSaving(false); onSave()
    } catch(err) { setSaving(false); alert('Save failed: ' + err.message) }
  }

  return (
    <div>
      <div style={fgrp}><label style={flbl}>Address *</label><input style={inp} value={addr} onChange={e=>setAddr(e.target.value)} placeholder="123 Main St" /></div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>City</label><input style={inp} value={city} onChange={e=>setCity(e.target.value)} /></div>
        <div style={fgrp}><label style={flbl}>Zip</label><input style={inp} value={zip} onChange={e=>setZip(e.target.value)} /></div>
      </div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Property Attributes</label><input style={inp} value={attrs} onChange={e=>setAttrs(e.target.value)} placeholder="e.g. Hard Corner, Freestanding, Drive-Thru" /></div>
      </div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Acreage</label><input style={inp} type="number" step="0.01" value={acreage} onChange={e=>setAcreage(e.target.value)} /></div>
        <div style={fgrp}><label style={flbl}>Building SF</label><input style={inp} type="number" value={sf} onChange={e=>setSf(e.target.value)} /></div>
      </div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Zoning</label><input style={inp} value={zoning} onChange={e=>setZoning(e.target.value)} /></div>
        <div style={fgrp}><label style={flbl}>Status</label><select style={inp} value={status} onChange={e=>setStatus(e.target.value)}>{['New','Researching','Calling','Connected','Pitched','Active','Dead'].map(s=><option key={s}>{s}</option>)}</select></div>
      </div>
      <div style={{...secTitle, marginTop:'10px'}}>Ownership</div>
      <div style={fgrp}><label style={flbl}>Ownership Entity</label><input style={inp} value={entity} onChange={e=>setEntity(e.target.value)} /></div>
      <div style={fgrp}><label style={flbl}>Owner Name</label><input style={inp} value={ownerName} onChange={e=>setOwnerName(e.target.value)} /></div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Owner Phone</label><input style={inp} value={ownerPhone} onChange={e=>setOwnerPhone(e.target.value)} /></div>
        <div style={fgrp}><label style={flbl}>Owner Email</label><input style={inp} value={ownerEmail} onChange={e=>setOwnerEmail(e.target.value)} /></div>
      </div>
      <div style={fgrp}><label style={flbl}>Notes</label><textarea style={{...inp, minHeight:'70px', resize:'vertical'}} value={notes} onChange={e=>setNotes(e.target.value)} /></div>
      <div style={{display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'12px', paddingTop:'12px', borderTop:'1px solid #e2dcc8'}}>
        <button style={btnSecondary} onClick={onCancel}>Cancel</button>
        <button style={{...btnPrimary, opacity:saving?0.6:1}} onClick={handleSave} disabled={saving}>{saving?'Saving...':editing?'Save Changes':'Save Property'}</button>
      </div>
    </div>
  )
}

// ─── Contact Form ─────────────────────────────────────────────────────────────
function ContactForm({ data, props, deals, lists, onSave, onCancel }) {
  const editing = !!data
  const g = f => data?.fields?.[f] || ''
  const [firstName, setFirstName] = useState(g('First Name'))
  const [lastName, setLastName] = useState(g('Last Name'))
  const [company, setCompany] = useState(g('Company'))
  const [title, setTitle] = useState(g('Title'))
  const [role, setRole] = useState(fv(data?.fields, 'Role') || '')
  const [phone, setPhone] = useState(g('Phone'))
  const [email, setEmail] = useState(g('Email'))
  const [notes, setNotes] = useState(g('Notes'))
  const [propId, setPropId] = useState(null)
  const [dealId, setDealId] = useState(null)
  const [listId, setListId] = useState(null)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!firstName && !lastName) return alert('First or Last Name required')
    setSaving(true)
    const fields = {
      'First Name': firstName || undefined,
      'Last Name': lastName || undefined,
      'Company': company || undefined,
      'Title': title || undefined,
      'Role': role || undefined,
      'Phone': phone || undefined,
      'Email': email || undefined,
      'Notes': notes || undefined,
      ...(propId ? { 'Linked Property': [propId] } : {}),
      ...(dealId ? { 'Linked Deal': [dealId] } : {}),
      ...(listId ? { 'Linked Listing': [listId] } : {}),
    }
    const clean = Object.fromEntries(Object.entries(fields).filter(([,v]) => v !== undefined))
    try {
      if (editing) await apiUpdate('conts', data.id, clean)
      else await apiCreate('conts', clean)
      setSaving(false); onSave()
    } catch(err) { setSaving(false); alert('Save failed: ' + err.message) }
  }

  return (
    <div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>First Name *</label><input style={inp} value={firstName} onChange={e=>setFirstName(e.target.value)} /></div>
        <div style={fgrp}><label style={flbl}>Last Name</label><input style={inp} value={lastName} onChange={e=>setLastName(e.target.value)} /></div>
      </div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Company</label><input style={inp} value={company} onChange={e=>setCompany(e.target.value)} /></div>
        <div style={fgrp}><label style={flbl}>Title</label><input style={inp} value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. VP Real Estate" /></div>
      </div>
      <div style={row2}>
        <div style={fgrp}><label style={flbl}>Role</label><select style={inp} value={role} onChange={e=>setRole(e.target.value)}><option value="">Select...</option>{['Owner','Landlord','Broker','Attorney','Tenant Rep','Property Manager','Other'].map(r=><option key={r}>{r}</option>)}</select></div>
        <div style={fgrp}><label style={flbl}>Phone</label><input style={inp} value={phone} onChange={e=>setPhone(e.target.value)} /></div>
      </div>
      <div style={fgrp}><label style={flbl}>Email</label><input style={inp} type="email" value={email} onChange={e=>setEmail(e.target.value)} /></div>
      <SearchInput label="Linked Property" records={props} nameField={F.props.addr} subField={F.props.city} onSelect={setPropId} placeholder="Search property..." />
      <SearchInput label="Linked Deal" records={deals} nameField={F.deals.name} subField={F.deals.stage} onSelect={setDealId} placeholder="Search deals..." />
      <SearchInput label="Linked Listing" records={lists} nameField={F.lists.name} subField={F.lists.status} onSelect={setListId} placeholder="Search listings..." />
      <div style={fgrp}><label style={flbl}>Notes</label><textarea style={{...inp, minHeight:'60px', resize:'vertical'}} value={notes} onChange={e=>setNotes(e.target.value)} /></div>
      <div style={{display:'flex', gap:'8px', justifyContent:'flex-end', marginTop:'12px', paddingTop:'12px', borderTop:'1px solid #e2dcc8'}}>
        <button style={btnSecondary} onClick={onCancel}>Cancel</button>
        <button style={{...btnPrimary, opacity:saving?0.6:1}} onClick={handleSave} disabled={saving}>{saving?'Saving...':editing?'Save Changes':'Save Contact'}</button>
      </div>
    </div>
  )
}


// ─── Prospecting Page ─────────────────────────────────────────────────────────
function ProspectingPage({ allData, onRefresh, onSelectProperty }) {
  const { props, acts, conts, deals, lists } = allData
  const [modal, setModal] = useState(null)
  const [selectedProp, setSelectedProp] = useState(null)
  const [expandedId, setExpandedId] = useState(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('All')
  const [saving, setSaving] = useState(null)

  const now = new Date()
  const STATUS_ORDER = ['New','Researching','Calling','Connected','Pitched','Active','Dead']
  const STATUS_COLORS = { 'New':'#6b7280','Researching':'#1d4ed8','Calling':'#a16207','Connected':'#316828','Pitched':'#7c3aed','Active':'#16a34a','Dead':'#dc2626' }

  const overdue = props.filter(p => {
    const lo = p.fields[F.props.lastOutreach]
    const status = fv(p.fields, F.props.status)
    if (status === 'Dead' || status === 'Active') return false
    if (!lo) return true
    return Math.floor((now - new Date(lo)) / 86400000) > 0
  })

  const filtered = props
    .filter(p => {
      const status = fv(p.fields, F.props.status)
      if (statusFilter !== 'All' && status !== statusFilter) return false
      if (search) {
        const q = search.toLowerCase()
        return (fv(p.fields,F.props.addr)+fv(p.fields,F.props.city)+fv(p.fields,F.props.entity)+fv(p.fields,F.props.ownerName)).toLowerCase().includes(q)
      }
      return true
    })
    .sort((a,b) => {
      const aLo = a.fields[F.props.lastOutreach] || ''
      const bLo = b.fields[F.props.lastOutreach] || ''
      if (aLo !== bLo) return aLo.localeCompare(bLo)
      return STATUS_ORDER.indexOf(fv(a.fields,F.props.status)) - STATUS_ORDER.indexOf(fv(b.fields,F.props.status))
    })

  const quickLogVM = async (propId) => {
    setSaving(propId)
    try {
      const today = new Date().toISOString().split('T')[0]
      await apiCreate('acts', {
        'Activity': 'Call attempt — Voicemail',
        'Type': 'Call',
        'Date': today,
        'Outcome': 'Voicemail',
        'Linked Property': [propId],
      })
      const prop = props.find(p => p.id === propId)
      const attempts = (prop?.fields[F.props.attempts] || 0) + 1
      await apiUpdate('props', propId, {
        'Outreach Attempts': attempts,
        'Last Outreach Date': today,
        ...(!prop?.fields[F.props.firstOutreach] ? { 'First Outreach Date': today } : {}),
      })
      onRefresh()
    } catch(err) { alert('Error: ' + err.message) }
    setSaving(null)
  }

  const updateStatus = async (propId, newStatus) => {
    try { await apiUpdate('props', propId, { 'Prospecting Status': newStatus }); onRefresh() }
    catch(err) { alert('Error: ' + err.message) }
  }

  const byStatus = {}
  STATUS_ORDER.forEach(s => { byStatus[s] = props.filter(p => fv(p.fields,F.props.status) === s).length })

  return (
    <div>
      {/* Status bar */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:'8px', marginBottom:'16px' }}>
        {STATUS_ORDER.map(s => (
          <div key={s} onClick={() => setStatusFilter(statusFilter === s ? 'All' : s)}
            style={{ background: statusFilter===s ? STATUS_COLORS[s] : '#fff', color: statusFilter===s ? '#fff' : '#1a1a1a', border:`2px solid ${STATUS_COLORS[s]}`, borderRadius:'8px', padding:'10px', textAlign:'center', cursor:'pointer' }}>
            <div style={{ fontSize:'20px', fontWeight:700 }}>{byStatus[s]||0}</div>
            <div style={{ fontSize:'10px', fontWeight:600, textTransform:'uppercase', letterSpacing:'0.05em', marginTop:'2px' }}>{s}</div>
          </div>
        ))}
      </div>

      {/* Overdue banner */}
      {overdue.length > 0 && (
        <div style={{ background:'#fee2e2', border:'1px solid #fca5a5', borderRadius:'8px', padding:'10px 14px', marginBottom:'14px', display:'flex', alignItems:'center', gap:'10px' }}>
          <span style={{ fontSize:'16px' }}>🔴</span>
          <span style={{ fontWeight:700, color:'#dc2626', fontSize:'13px' }}>{overdue.length} properties need outreach</span>
        </div>
      )}

      {/* Search + filter */}
      <div style={{ display:'flex', gap:'10px', marginBottom:'14px', alignItems:'center' }}>
        <input style={{ ...inp, maxWidth:'280px' }} placeholder="Search address, owner, entity..." value={search} onChange={e => setSearch(e.target.value)} />
        <select style={{ ...inp, maxWidth:'160px' }} value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
          <option value="All">All Statuses</option>
          {STATUS_ORDER.map(s => <option key={s}>{s}</option>)}
        </select>
        <div style={{ marginLeft:'auto', fontSize:'12px', color:'#9ca3af' }}>{filtered.length} properties</div>
      </div>

      {/* Call Sheet */}
      <div style={card}>
        <table style={tbl}>
          <thead>
            <tr>
              <th style={th}>Property</th>
              <th style={th}>Owner / Entity</th>
              <th style={th}>Status</th>
              <th style={th}>Attempts</th>
              <th style={th}>Last Outreach</th>
              <th style={th}>Source</th>
              <th style={th}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(p => {
              const pf = p.fields
              const isExpanded = expandedId === p.id
              const propConts = conts.filter(c => linked(c.fields, F.conts.linkedProp).some(l => l.id === p.id))
              const lo = pf[F.props.lastOutreach]
              const daysAgo = lo ? Math.floor((now - new Date(lo)) / 86400000) : null
              const isOverdue = !['Dead','Active'].includes(fv(pf,F.props.status)) && (!lo || daysAgo > 0)

              return (
                <React.Fragment key={p.id}>
                  <tr style={{ background: isOverdue?'#fff9f9':isExpanded?'#faf8f0':'#fff', cursor:'pointer' }} onClick={() => setExpandedId(isExpanded ? null : p.id)}>
                    <td style={td}>
                      <div style={{ fontWeight:600, color:'#316828' }}>{fv(pf,F.props.addr)}</div>
                      <div style={{ fontSize:'11px', color:'#9ca3af' }}>{fv(pf,F.props.city)}{pf[F.props.sf]?' · '+Number(pf[F.props.sf]).toLocaleString()+' SF':''}{pf[F.props.acreage]?' · '+pf[F.props.acreage]+' ac':''}</div>
                    </td>
                    <td style={td}>
                      <div style={{ fontWeight:500 }}>{fv(pf,F.props.ownerName)||fv(pf,F.props.entity)||'—'}</div>
                      {fv(pf,F.props.ownerName) && fv(pf,F.props.entity) && <div style={{ fontSize:'11px', color:'#9ca3af' }}>{fv(pf,F.props.entity)}</div>}
                      {fv(pf,F.props.ownerPhone) && <div style={{ fontSize:'12px', color:'#316828', fontWeight:500 }}>{fv(pf,F.props.ownerPhone)}</div>}
                    </td>
                    <td style={td} onClick={e => e.stopPropagation()}>
                      <select style={{ ...inp, padding:'3px 6px', fontSize:'12px', width:'120px' }} value={fv(pf,F.props.status)} onChange={e => updateStatus(p.id, e.target.value)}>
                        {STATUS_ORDER.map(s => <option key={s}>{s}</option>)}
                      </select>
                    </td>
                    <td style={{ ...td, textAlign:'center' }}>
                      <span style={{ fontWeight:700, color:(pf[F.props.attempts]||0)>3?'#dc2626':'#1a1a1a' }}>{pf[F.props.attempts]||0}</span>
                    </td>
                    <td style={td}>
                      {lo ? (
                        <div>
                          <div style={{ fontSize:'12px', fontWeight:500 }}>{lo}</div>
                          <div style={{ fontSize:'11px', color:isOverdue?'#dc2626':'#9ca3af' }}>{daysAgo===0?'Today':`${daysAgo}d ago`}</div>
                        </div>
                      ) : <span style={{ color:'#dc2626', fontSize:'12px', fontWeight:600 }}>Never</span>}
                    </td>
                    <td style={{ ...td, color:'#6b7280', fontSize:'12px' }}>{fv(pf,F.props.source)||'—'}</td>
                    <td style={td} onClick={e => e.stopPropagation()}>
                      <div style={{ display:'flex', gap:'4px', flexWrap:'wrap' }}>
                        <button style={btnSmall} disabled={saving===p.id} onClick={() => quickLogVM(p.id)}>{saving===p.id?'...':'📞 VM'}</button>
                        <button style={{ ...btnSmall, background:'#e8f0e9', color:'#316828', borderColor:'#316828' }} onClick={() => { setSelectedProp(p); setModal('logcall') }}>Log Call</button>
                        <button style={{ ...btnSmall, background:'#faf8f0', color:'#c69425', borderColor:'#c69425' }} onClick={() => onSelectProperty(p)}>View →</button>
                      </div>
                    </td>
                  </tr>
                  {isExpanded && (
                    <tr key={p.id+'_exp'} style={{ background:'#faf8f0' }}>
                      <td colSpan={7} style={{ padding:'12px 16px', borderBottom:'1px solid #e2dcc8' }}>
                        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'16px' }}>
                          <div>
                            <div style={secTitle}>Research Notes</div>
                            <div style={{ fontSize:'12px', color:'#374151', whiteSpace:'pre-wrap', background:'#fff', borderRadius:'6px', padding:'8px', border:'1px solid #e2dcc8', minHeight:'60px' }}>{fv(pf,F.props.notes)||'No notes. Click View → to edit.'}</div>
                          </div>
                          <div>
                            <div style={{ ...secTitle, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                              Confirmed Contacts
                              <button style={btnSmall} onClick={() => { setSelectedProp(p); setModal('addcontact') }}>+ Add</button>
                            </div>
                            {propConts.length === 0
                              ? <div style={{ fontSize:'12px', color:'#9ca3af' }}>No confirmed contacts yet</div>
                              : propConts.map(c => (
                                <div key={c.id} style={{ background:'#fff', border:'1px solid #e2dcc8', borderRadius:'6px', padding:'8px', marginBottom:'6px' }}>
                                  <div style={{ fontWeight:600, fontSize:'13px' }}>{contName(c.fields)}</div>
                                  {fv(c.fields,F.conts.title) && <div style={{ fontSize:'11px', color:'#6b7280' }}>{fv(c.fields,F.conts.title)}</div>}
                                  {fv(c.fields,F.conts.phone) && <div style={{ fontSize:'12px', color:'#316828', fontWeight:500 }}>{fv(c.fields,F.conts.phone)}</div>}
                                  {fv(c.fields,F.conts.email) && <div style={{ fontSize:'11px', color:'#6b7280' }}>{fv(c.fields,F.conts.email)}</div>}
                                </div>
                              ))
                            }
                          </div>
                          <div>
                            <div style={secTitle}>Quick Actions</div>
                            <div style={{ display:'flex', flexDirection:'column', gap:'6px' }}>
                              <button style={{ ...btnSecondary, fontSize:'12px', textAlign:'left' }} onClick={() => { setSelectedProp(p); setModal('logcall') }}>📞 Log Detailed Call</button>
                              <button style={{ ...btnSecondary, fontSize:'12px', textAlign:'left' }} onClick={() => onSelectProperty(p)}>📋 Full Property View</button>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {modal === 'logcall' && selectedProp && (
        <Modal title={`Log Call — ${fv(selectedProp.fields,F.props.addr)}`} onClose={() => setModal(null)}>
          <ActivityForm props={allData.props} deals={deals} lists={lists} prefillPropId={selectedProp.id}
            onSave={async () => {
              const today = new Date().toISOString().split('T')[0]
              const attempts = (selectedProp.fields[F.props.attempts]||0) + 1
              await apiUpdate('props', selectedProp.id, {
                'Outreach Attempts': attempts,
                'Last Outreach Date': today,
                ...(!selectedProp.fields[F.props.firstOutreach] ? { 'First Outreach Date': today } : {}),
              })
              setModal(null); onRefresh()
            }}
            onCancel={() => setModal(null)} />
        </Modal>
      )}
      {modal === 'addcontact' && selectedProp && (
        <Modal title={`Add Contact — ${fv(selectedProp.fields,F.props.addr)}`} onClose={() => setModal(null)}>
          <ContactForm props={allData.props} deals={deals} lists={lists} onSave={() => { setModal(null); onRefresh() }} onCancel={() => setModal(null)} />
        </Modal>
      )}
    </div>
  )
}

// ─── GTD Page ─────────────────────────────────────────────────────────────────
function GTDPage({ acts, onRefresh }) {
  const now = new Date()
  const todayStr = now.toDateString()
  const [actTab, setActTab] = useState('capture')
  const [captureText, setCaptureText] = useState('')
  const [captureSaving, setCaptureSaving] = useState(false)
  const [clarifyIdx, setClarifyIdx] = useState(0)
  const [updating, setUpdating] = useState(null)

  const inbox = acts.filter(a => !fv(a.fields, F.acts.status) && (a.fields[F.acts.capture] || fv(a.fields, F.acts.desc)))
  const nextActions = acts.filter(a => fv(a.fields, F.acts.status) === 'Deferred')
  const waitingFor = acts.filter(a => fv(a.fields, F.acts.status) === 'Delegated')
  const someday = acts.filter(a => fv(a.fields, F.acts.status) === 'Incubate')
  const recent = [...acts].sort((a,b) => (b.fields[F.acts.date]||'').localeCompare(a.fields[F.acts.date]||'')).slice(0,25)

  const overdueFU = acts.filter(a => {
    const fd = a.fields[F.acts.fuDate]
    return fd && !a.fields[F.acts.fuDone] && new Date(fd) < now && new Date(fd).toDateString() !== todayStr
  })
  const dueTodayFU = acts.filter(a => {
    const fd = a.fields[F.acts.fuDate]
    return fd && !a.fields[F.acts.fuDone] && new Date(fd).toDateString() === todayStr
  })

  const handleCapture = async () => {
    if (!captureText.trim()) return
    setCaptureSaving(true)
    try {
      await apiCreate('acts', {
        'Activity': captureText.trim(),
        'Capture': captureText.trim(),
        'Date': now.toISOString().split('T')[0],
      })
      setCaptureText('')
      await onRefresh()
    } catch(e) { alert('Error: ' + e.message) }
    setCaptureSaving(false)
  }

  const clarifyItem = async (id, status, nextAction) => {
    setUpdating(id)
    try {
      const fields = { 'Status': status }
      if (nextAction) fields['Next Action'] = nextAction
      await apiUpdate('acts', id, fields)
      setClarifyIdx(0)
      await onRefresh()
    } catch(e) { alert('Error: ' + e.message) }
    setUpdating(null)
  }

  const CONTEXTS = ['@Call','@Email','@Computer','@Car','@Errand','@Anywhere']
  const byContext = {}
  CONTEXTS.forEach(c => { byContext[c] = nextActions.filter(a => fv(a.fields, F.acts.nextAction) === c) })
  const uncontexted = nextActions.filter(a => !fv(a.fields, F.acts.nextAction))

  const TABS = [
    { id: 'capture', label: '⚡ Capture' },
    { id: 'clarify', label: `🔍 Clarify (${inbox.length})`, red: inbox.length > 0 },
    { id: 'next', label: `✅ Next Actions (${nextActions.length})` },
    { id: 'waiting', label: `⏳ Waiting (${waitingFor.length})` },
    { id: 'someday', label: `💭 Someday (${someday.length})` },
    { id: 'followups', label: `🔴 Follow-Ups (${overdueFU.length + dueTodayFU.length})`, red: overdueFU.length > 0 },
    { id: 'log', label: 'All Activity' },
  ]

  const GtdRow = ({ a }) => (
    <tr key={a.id}>
      <td style={td}>
        <div style={{fontWeight:500}}>{fv(a.fields,F.acts.capture) || fv(a.fields,F.acts.desc) || '—'}</div>
        {a.fields[F.acts.notes] && <div style={{fontSize:'11px',color:'#9ca3af',marginTop:'2px'}}>{a.fields[F.acts.notes]}</div>}
      </td>
      <td style={{...td,color:'#6b7280'}}>{fv(a.fields,F.acts.date)||'—'}</td>
      <td style={{...td,color:'#6b7280',fontSize:'12px'}}>
        {linked(a.fields,F.acts.linkedDeal)[0] ? '🤝 Deal' : linked(a.fields,F.acts.linkedProp)[0] ? '🏠 Property' : linked(a.fields,F.acts.linkedListing)[0] ? '📋 Listing' : '—'}
      </td>
      <td style={td}>
        <button style={{...btnSmall, color:'#dc2626', borderColor:'#dc2626'}} disabled={!!updating}
          onClick={() => clarifyItem(a.id, 'Done')}>✓ Done</button>
      </td>
    </tr>
  )

  return (
    <div>
      <div style={{display:'flex', gap:'6px', marginBottom:'16px', flexWrap:'wrap'}}>
        {TABS.map(t => (
          <button key={t.id} onClick={() => setActTab(t.id)} style={{
            ...actTab===t.id ? btnPrimary : btnSecondary,
            fontSize:'12px', padding:'6px 12px',
            ...(t.red && actTab !== t.id ? {borderColor:'#dc2626',color:'#dc2626'} : {})
          }}>{t.label}</button>
        ))}
      </div>

      {actTab === 'capture' && (
        <div>
          <div style={{...card, padding:'16px', marginBottom:'16px'}}>
            <div style={{fontSize:'13px', fontWeight:700, marginBottom:'6px'}}>Brain Dump</div>
            <div style={{fontSize:'12px', color:'#6b7280', marginBottom:'10px'}}>Don't think — just dump. Capture everything, process in Clarify.</div>
            <textarea
              style={{...inp, minHeight:'100px', resize:'vertical', marginBottom:'10px'}}
              placeholder="e.g. Call Drew re: Strongsville signal easement... Follow up with Tom on parking... Review 7 Brew LOI redlines..."
              value={captureText}
              onChange={e => setCaptureText(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && e.metaKey) handleCapture() }}
            />
            <div style={{display:'flex', gap:'8px', alignItems:'center'}}>
              <button style={{...btnPrimary, opacity: captureSaving ? 0.6 : 1}} onClick={handleCapture} disabled={captureSaving}>
                {captureSaving ? 'Saving...' : '⚡ Capture (⌘↵)'}
              </button>
              <span style={{fontSize:'11px', color:'#9ca3af'}}>Inbox: {inbox.length} items to process</span>
            </div>
          </div>
        </div>
      )}

      {actTab === 'clarify' && (
        <div>
          {inbox.length === 0 ? (
            <div style={{...card, padding:'24px', textAlign:'center'}}>
              <div style={{fontSize:'24px', marginBottom:'8px'}}>✅</div>
              <div style={{fontWeight:700, marginBottom:'4px'}}>Inbox zero</div>
              <div style={{fontSize:'13px', color:'#6b7280'}}>Everything's been processed.</div>
            </div>
          ) : (
            <div>
              <div style={{fontSize:'12px', color:'#6b7280', marginBottom:'12px'}}>{inbox.length} items to process · Showing {clarifyIdx + 1} of {inbox.length}</div>
              {(() => {
                const item = inbox[clarifyIdx]
                if (!item) return null
                const text = fv(item.fields, F.acts.capture) || fv(item.fields, F.acts.desc)
                return (
                  <div style={{...card, padding:'20px'}}>
                    <div style={{fontSize:'16px', fontWeight:600, marginBottom:'6px', lineHeight:1.4}}>{text}</div>
                    <div style={{fontSize:'12px', color:'#9ca3af', marginBottom:'20px'}}>{fv(item.fields, F.acts.date)}</div>
                    <div style={{fontSize:'11px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'10px'}}>Is it actionable?</div>
                    <div style={{display:'flex', gap:'8px', marginBottom:'16px', flexWrap:'wrap'}}>
                      <button style={{...btnSecondary, fontSize:'12px', color:'#dc2626', borderColor:'#dc2626'}} disabled={!!updating} onClick={() => clarifyItem(item.id, 'Trash')}>🗑 Trash</button>
                      <button style={{...btnSecondary, fontSize:'12px'}} disabled={!!updating} onClick={() => clarifyItem(item.id, 'Incubate')}>💭 Someday/Maybe</button>
                      <button style={{...btnSecondary, fontSize:'12px'}} disabled={!!updating} onClick={() => clarifyItem(item.id, 'Reference')}>📁 Reference</button>
                    </div>
                    <div style={{borderTop:'1px solid #e2dcc8', paddingTop:'16px', marginBottom:'10px'}}>
                      <div style={{fontSize:'11px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'10px'}}>Actionable — what's the next step?</div>
                      <div style={{display:'flex', gap:'8px', marginBottom:'12px', flexWrap:'wrap'}}>
                        <button style={{...btnSecondary, fontSize:'12px'}} disabled={!!updating} onClick={() => clarifyItem(item.id, 'Project')}>📋 Project (multi-step)</button>
                        <button style={{...btnSecondary, fontSize:'12px', color:'#7c3aed', borderColor:'#7c3aed'}} disabled={!!updating} onClick={() => clarifyItem(item.id, 'Delegated')}>👤 Delegate / Waiting For</button>
                        <button style={{...btnSecondary, fontSize:'12px', color:'#316828', borderColor:'#316828'}} disabled={!!updating} onClick={() => clarifyItem(item.id, 'Done')}>⚡ Do it now (2 min)</button>
                      </div>
                      <div style={{fontSize:'11px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'8px'}}>Defer — pick context:</div>
                      <div style={{display:'flex', gap:'6px', flexWrap:'wrap'}}>
                        {CONTEXTS.map(c => (
                          <button key={c} style={{...btnSmall, background:'#e8f0e9', color:'#316828', borderColor:'#316828', fontSize:'12px', padding:'5px 10px'}}
                            disabled={!!updating} onClick={() => clarifyItem(item.id, 'Deferred', c)}>
                            {updating === item.id ? '...' : c}
                          </button>
                        ))}
                      </div>
                    </div>
                    {inbox.length > 1 && (
                      <div style={{marginTop:'16px', borderTop:'1px solid #f0edd8', paddingTop:'12px'}}>
                        <button style={{...btnSecondary, fontSize:'12px'}} onClick={() => setClarifyIdx(i => (i+1) % inbox.length)}>Skip → next item</button>
                      </div>
                    )}
                  </div>
                )
              })()}
            </div>
          )}
        </div>
      )}

      {actTab === 'next' && (
        <div>
          {nextActions.length === 0
            ? <div style={{color:'#9ca3af', fontSize:'13px', padding:'8px 0'}}>No next actions. Process your inbox in Clarify.</div>
            : <div>
                {uncontexted.length > 0 && (
                  <div style={{marginBottom:'20px'}}>
                    <div style={{fontSize:'12px', fontWeight:700, color:'#dc2626', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'8px'}}>No Context Set ({uncontexted.length})</div>
                    <div style={card}><table style={tbl}><thead><tr><th style={th}>Item</th><th style={th}>Date</th><th style={th}>Linked</th><th style={th}></th></tr></thead>
                    <tbody>{uncontexted.map(a => <GtdRow key={a.id} a={a} />)}</tbody></table></div>
                  </div>
                )}
                {CONTEXTS.map(c => byContext[c].length > 0 && (
                  <div key={c} style={{marginBottom:'20px'}}>
                    <div style={{fontSize:'12px', fontWeight:700, color:'#7c3aed', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'8px'}}>{c} ({byContext[c].length})</div>
                    <div style={card}><table style={tbl}><thead><tr><th style={th}>Item</th><th style={th}>Date</th><th style={th}>Linked</th><th style={th}></th></tr></thead>
                    <tbody>{byContext[c].map(a => <GtdRow key={a.id} a={a} />)}</tbody></table></div>
                  </div>
                ))}
              </div>
          }
        </div>
      )}

      {actTab === 'waiting' && (
        <div>
          {waitingFor.length === 0
            ? <div style={{color:'#9ca3af', fontSize:'13px', padding:'8px 0'}}>Nothing delegated or waiting on others.</div>
            : <div style={card}><table style={tbl}><thead><tr><th style={th}>Item</th><th style={th}>Date</th><th style={th}>Linked</th><th style={th}></th></tr></thead>
              <tbody>{waitingFor.map(a => <GtdRow key={a.id} a={a} />)}</tbody></table></div>
          }
        </div>
      )}

      {actTab === 'someday' && (
        <div>
          {someday.length === 0
            ? <div style={{color:'#9ca3af', fontSize:'13px', padding:'8px 0'}}>Nothing parked in Someday/Maybe.</div>
            : <div style={card}><table style={tbl}><thead><tr><th style={th}>Item</th><th style={th}>Date</th><th style={th}>Linked</th><th style={th}></th></tr></thead>
              <tbody>{someday.map(a => <GtdRow key={a.id} a={a} />)}</tbody></table></div>
          }
        </div>
      )}

      {actTab === 'followups' && (
        <div>
          {overdueFU.length > 0 && (
            <div style={{marginBottom:'20px'}}>
              <div style={{fontSize:'12px', fontWeight:700, color:'#dc2626', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'8px'}}>🔴 Overdue ({overdueFU.length})</div>
              <div style={card}><table style={tbl}><thead><tr><th style={th}>Activity</th><th style={th}>Follow-Up Action</th><th style={th}>Due</th><th style={th}>Linked</th></tr></thead>
              <tbody>{overdueFU.map(a => (
                <tr key={a.id} style={{background:'#fff9f9'}}>
                  <td style={td}><div style={{fontWeight:500}}>{fv(a.fields,F.acts.desc)||'—'}</div></td>
                  <td style={{...td,color:'#374151'}}>{fv(a.fields,F.acts.fuAction)||'—'}</td>
                  <td style={{...td,color:'#dc2626',fontWeight:600}}>{fv(a.fields,F.acts.fuDate)}</td>
                  <td style={{...td,color:'#6b7280',fontSize:'12px'}}>{linked(a.fields,F.acts.linkedDeal)[0]?'🤝 Deal':linked(a.fields,F.acts.linkedProp)[0]?'🏠 Property':linked(a.fields,F.acts.linkedListing)[0]?'📋 Listing':'—'}</td>
                </tr>
              ))}</tbody></table></div>
            </div>
          )}
          {dueTodayFU.length > 0 && (
            <div style={{marginBottom:'20px'}}>
              <div style={{fontSize:'12px', fontWeight:700, color:'#c69425', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'8px'}}>🟡 Due Today ({dueTodayFU.length})</div>
              <div style={card}><table style={tbl}><thead><tr><th style={th}>Activity</th><th style={th}>Follow-Up Action</th><th style={th}>Due</th><th style={th}>Linked</th></tr></thead>
              <tbody>{dueTodayFU.map(a => (
                <tr key={a.id}>
                  <td style={td}><div style={{fontWeight:500}}>{fv(a.fields,F.acts.desc)||'—'}</div></td>
                  <td style={{...td,color:'#374151'}}>{fv(a.fields,F.acts.fuAction)||'—'}</td>
                  <td style={{...td,color:'#c69425',fontWeight:600}}>{fv(a.fields,F.acts.fuDate)}</td>
                  <td style={{...td,color:'#6b7280',fontSize:'12px'}}>{linked(a.fields,F.acts.linkedDeal)[0]?'🤝 Deal':linked(a.fields,F.acts.linkedProp)[0]?'🏠 Property':linked(a.fields,F.acts.linkedListing)[0]?'📋 Listing':'—'}</td>
                </tr>
              ))}</tbody></table></div>
            </div>
          )}
          {overdueFU.length === 0 && dueTodayFU.length === 0 && (
            <div style={{color:'#9ca3af', fontSize:'13px', padding:'8px 0'}}>No follow-ups due. You're clear.</div>
          )}
        </div>
      )}

      {actTab === 'log' && (
        <div>
          <div style={{fontSize:'12px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'8px'}}>Last 25 Activities</div>
          <ActsTable acts={recent} />
        </div>
      )}
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
  const [collapsed, setCollapsed] = useState({})
  const toggleSection = key => setCollapsed(c => ({ ...c, [key]: !c[key] }))

  const fetchData = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/data')
    const json = await res.json()
    setData(json)
    setLoading(false)
  }, [])

  useEffect(() => { fetchData() }, [fetchData])

  const setView2 = (v) => { setView(v); setSearch(''); setSelected({ listing: null, deal: null, property: null, tenant: null }) }
  const onRefresh = async () => {
    try {
      const res = await fetch('/api/data')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const json = await res.json()
      if (json.error) throw new Error(json.error)
      setData(json)
      // Update selected records with fresh data so detail views reflect changes
      setSelected(s => {
        const updated = { ...s }
        if (s.deal && json.deals) updated.deal = json.deals.find(d => d.id === s.deal.id) || s.deal
        if (s.listing && json.lists) updated.listing = json.lists.find(l => l.id === s.listing.id) || s.listing
        if (s.property && json.props) updated.property = json.props.find(p => p.id === s.property.id) || s.property
        return updated
      })
    } catch(err) {
      console.error('Refresh failed:', err)
      alert('Data refresh failed — your save went through but the page may be stale. Reload to see latest data.\n\n' + err.message)
    }
  }

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

  const overdueCount = acts.filter(a => { const fd = a.fields[F.acts.fuDate]; return fd && !a.fields[F.acts.fuDone] && new Date(fd) <= new Date() }).length

  const VIEWS = [
    { id: 'dashboard', label: 'Dashboard' },
    { id: 'properties', label: 'Properties', count: props.length },
    { id: 'listings', label: 'Listings', count: lists.length },
    { id: 'deals', label: 'Deals', count: deals.length },
    { id: 'contacts', label: 'Contacts', count: conts.length },
    { id: 'activities', label: 'Activity / GTD', count: overdueCount || undefined, countRed: !!overdueCount },
    { id: 'calendar', label: 'Commission Cal.' },
  ]

  const allData = { props, lists, deals, conts, acts }

  // Tenant groups
  const tenants = [...new Set(deals.map(d => fv(d.fields, F.deals.clientName)).filter(Boolean))].sort()

  const detail = (() => {
    if (view === 'deals' && selected.deal) return <DealDetail deal={selected.deal} allData={allData} onBack={() => setSelected(s => ({...s, deal:null}))} onRefresh={onRefresh} />
    if (view === 'deals' && selected.tenant) return <TenantDashboard tenant={selected.tenant} allData={allData} onBack={() => setSelected(s => ({...s, tenant:null}))} onRefresh={onRefresh} />
    if (view === 'listings' && selected.listing) return <ListingDetail listing={selected.listing} allData={allData} onBack={() => setSelected(s => ({...s, listing:null}))} onRefresh={onRefresh} />
    if (view === 'properties' && selected.property) return <PropertyDetail property={selected.property} allData={allData} onBack={() => setSelected(s => ({...s, property:null}))} onRefresh={onRefresh} />
    return null
  })()

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
              {v.count !== undefined && <span style={{ marginLeft: 'auto', background: v.countRed ? '#fee2e2' : view === v.id ? '#f0edd8' : '#f5f2e8', color: v.countRed ? '#dc2626' : view === v.id ? '#316828' : '#9ca3af', fontSize: '11px', padding: '1px 7px', borderRadius: '10px', fontWeight: v.countRed ? 700 : 500 }}>{v.count}</span>}
            </div>
          ))}
        </nav>
        <div style={{ padding: '12px 8px', borderTop: '1px solid #e2dcc8' }}>
          <img src="/reat-logo.png" alt="REAT Logo" style={{ width: '100%', padding: '0 4px', marginBottom: '10px', boxSizing: 'border-box', display: 'block' }} />
          <button style={{ ...btnPrimary, width: '100%', textAlign: 'center', marginBottom: '10px', padding: '10px' }} onClick={() => setModal('quickadd')}>+ Add</button>
          <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '6px', paddingLeft: '4px' }}>{user?.firstName} {user?.lastName}</div>
          <UserButton afterSignOutUrl="/sign-in" />
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {/* Topbar */}
        <div style={{ padding: '10px 20px', borderBottom: '1px solid #e2dcc8', display: 'flex', alignItems: 'center', gap: '12px', background: '#fff' }}>
          <div style={{ fontSize: '15px', fontWeight: 700 }}>{detail ? '' : VIEWS.find(v=>v.id===view)?.label}</div>
          <input style={{ marginLeft: 'auto', background: '#faf8f0', border: '1px solid #e2dcc8', borderRadius: '6px', padding: '6px 12px', fontSize: '13px', width: '200px', outline: 'none' }} placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>
          {detail}

          {/* Dashboard */}
          {!detail && view === 'dashboard' && (() => {
            const now = new Date()
            const activeDeals = deals.filter(d => !['Executed','Dead'].includes(fv(d.fields,F.deals.stage)))
            
            // Close date buckets
            const bucket = (d) => {
              const cd = fv(d.fields, F.deals.closeDate)
              if (!cd) return 'unscheduled'
              const days = Math.ceil((new Date(cd) - now) / 86400000)
              if (days < 0) return 'overdue'
              if (days <= 30) return '0-30'
              if (days <= 60) return '31-60'
              if (days <= 90) return '61-90'
              if (days <= 120) return '91-120'
              if (days <= 180) return '121-180'
              return '180+'
            }
            const buckets = { 'overdue':[], '0-30':[], '31-60':[], '61-90':[], '91-120':[], '121-180':[], '180+':[], 'unscheduled':[] }
            activeDeals.forEach(d => buckets[bucket(d)].push(d))
            
            const BUCKET_LABELS = [
              { key:'overdue', label:'Overdue', color:'#dc2626', bg:'#fee2e2' },
              { key:'0-30', label:'0–30 Days', color:'#c69425', bg:'#fef9c3' },
              { key:'31-60', label:'31–60 Days', color:'#316828', bg:'#e8f0e9' },
              { key:'61-90', label:'61–90 Days', color:'#1d4ed8', bg:'#dbeafe' },
              { key:'91-120', label:'91–120 Days', color:'#7c3aed', bg:'#ede9fe' },
              { key:'121-180', label:'121–180 Days', color:'#6b7280', bg:'#f3f4f6' },
              { key:'180+', label:'180+ Days', color:'#9ca3af', bg:'#f9fafb' },
            ]
            
            const overdueFU = acts.filter(a => { const fd = a.fields[F.acts.fuDate]; return fd && !a.fields[F.acts.fuDone] && new Date(fd) <= now })
            const todayFU = acts.filter(a => { const fd = a.fields[F.acts.fuDate]; if (!fd || a.fields[F.acts.fuDone]) return false; const d = new Date(fd); const t = new Date(); return d.toDateString() === t.toDateString() })

            return (
              <div>
                {/* KPI Bar */}
                <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'12px', marginBottom:'20px' }}>
                  {[
                    { label:'Active Pipeline (Your 80%)', value:fmt$(activePipeline*0.8), color:'#316828', onClick:() => setView2('deals') },
                    { label:'YTD Closed (Gross)', value:fmt$(closedComm), color:'#c69425', onClick:() => setView2('deals') },
                    { label:'Active Deals', value:activeDeals.length, onClick:() => setView2('deals') },
                    { label:'Active Listings', value:activeListings, onClick:() => setView2('listings') },
                    { label:'Follow-Ups Due', value:overdueFU.length, color:overdueFU.length>0?'#dc2626':undefined, onClick:() => setView2('activities') },
                  ].map(c => (
                    <div key={c.label} onClick={c.onClick} style={{ background:'#fff', border:'1px solid #e2dcc8', borderRadius:'10px', padding:'14px 16px', cursor:'pointer' }}
                      onMouseEnter={e=>e.currentTarget.style.background='#faf8f0'}
                      onMouseLeave={e=>e.currentTarget.style.background='#fff'}>
                      <div style={{ fontSize:'11px', color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'6px' }}>{c.label}</div>
                      <div style={{ fontSize:'22px', fontWeight:700, color:c.color||'#1a1a1a' }}>{c.value}</div>
                    </div>
                  ))}
                </div>

                {/* Pipeline by close date */}
                <div onClick={() => toggleSection('timeline')} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', marginBottom:'10px' }}>
                  <div style={{ fontSize:'12px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.07em' }}>Pipeline by Close Date</div>
                  <span style={{ fontSize:'12px', color:'#9ca3af' }}>{collapsed['timeline'] ? '▶' : '▼'}</span>
                </div>
                {!collapsed['timeline'] && <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'10px', marginBottom:'20px' }}>
                  {BUCKET_LABELS.map(b => {
                    const bDeals = buckets[b.key]
                    const bComm = bDeals.reduce((s,d) => s + (d.fields[F.deals.estComm]||0), 0)
                    return (
                      <div key={b.key} style={{ background:'#fff', border:`1px solid ${b.bg === '#fff' ? '#e2dcc8' : b.bg}`, borderLeft:`4px solid ${b.color}`, borderRadius:'8px', padding:'12px 14px' }}>
                        <div style={{ fontSize:'11px', fontWeight:700, color:b.color, textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'6px' }}>{b.label}</div>
                        <div style={{ fontSize:'18px', fontWeight:700, color:'#1a1a1a', marginBottom:'2px' }}>{fmt$(bComm)}</div>
                        <div style={{ fontSize:'12px', color:'#316828', fontWeight:600 }}>You: {fmt$(bComm*0.8)}</div>
                        <div style={{ fontSize:'11px', color:'#9ca3af', marginBottom: bDeals.length ? '8px' : 0 }}>REAT: {fmt$(bComm*0.2)} · {bDeals.length} deal{bDeals.length !== 1 ? 's' : ''}</div>
                        {bDeals.map(d => (
                          <div key={d.id} onClick={() => { setView('deals'); setSelected(s => ({...s, deal:d})) }}
                            style={{ fontSize:'12px', padding:'5px 7px', marginBottom:'3px', background:b.bg, borderRadius:'4px', cursor:'pointer', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                            <span style={{ fontWeight:500, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', maxWidth:'65%' }}>{fv(d.fields,F.deals.name)}</span>
                            <span style={{ color:b.color, fontWeight:600, flexShrink:0 }}>{fmt$(d.fields[F.deals.estComm])}</span>
                          </div>
                        ))}
                      </div>
                    )
                  })}
                  {/* Unscheduled */}
                  {buckets['unscheduled'].length > 0 && (
                    <div style={{ background:'#fff', border:'1px solid #e2dcc8', borderLeft:'4px solid #d1d5db', borderRadius:'8px', padding:'12px 14px' }}>
                      <div style={{ fontSize:'11px', fontWeight:700, color:'#9ca3af', textTransform:'uppercase', letterSpacing:'0.06em', marginBottom:'6px' }}>No Close Date</div>
                      <div style={{ fontSize:'12px', color:'#6b7280', marginBottom:'8px' }}>{buckets['unscheduled'].length} deal{buckets['unscheduled'].length !== 1 ? 's' : ''}</div>
                      {buckets['unscheduled'].map(d => (
                        <div key={d.id} onClick={() => { setView('deals'); setSelected(s => ({...s, deal:d})) }}
                          style={{ fontSize:'12px', padding:'5px 7px', marginBottom:'3px', background:'#f9fafb', borderRadius:'4px', cursor:'pointer' }}>
                          <span style={{ fontWeight:500 }}>{fv(d.fields,F.deals.name)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>}

                {/* Active Deals */}
                <div onClick={() => toggleSection('deals')} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', marginBottom:'10px' }}>
                  <div style={{ fontSize:'12px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.07em' }}>Active Deals ({activeDeals.length})</div>
                  <span style={{ fontSize:'12px', color:'#9ca3af' }}>{collapsed['deals'] ? '▶' : '▼'}</span>
                </div>
                {!collapsed['deals'] && <div style={{ ...card, marginBottom:'20px' }}>
                  <table style={tbl}>
                    <thead><tr><th style={th}>Deal</th><th style={th}>Tenant</th><th style={th}>Stage</th><th style={th}>Gross Comm.</th><th style={th}>Your 80%</th><th style={th}>Close Date</th></tr></thead>
                    <tbody>{activeDeals.map(d => (
                      <tr key={d.id} style={{ cursor:'pointer' }} onClick={() => { setView('deals'); setSelected(s => ({...s, deal:d})) }}>
                        <td style={td}><div style={{fontWeight:500}}>{fv(d.fields,F.deals.name)}</div></td>
                        <td style={{...td,color:'#6b7280'}}>{fv(d.fields,F.deals.clientName)||'—'}</td>
                        <td style={td}><Badge value={d.fields[F.deals.stage]} /></td>
                        <td style={{...td,color:'#c69425',fontWeight:600}}>{fmt$(d.fields[F.deals.estComm])}</td>
                        <td style={{...td,color:'#316828',fontWeight:600}}>{fmt$((d.fields[F.deals.estComm]||0)*0.8)}</td>
                        <td style={{...td,color:'#6b7280'}}>{fv(d.fields,F.deals.closeDate)||'—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>}

                {/* Listing Pipeline */}
                <div onClick={() => toggleSection('listings')} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', cursor:'pointer', marginBottom:'10px' }}>
                  <div style={{ fontSize:'12px', fontWeight:700, color:'#6b7280', textTransform:'uppercase', letterSpacing:'0.07em' }}>Listing Pipeline ({lists.filter(l => fv(l.fields,F.lists.status) === 'Active').length})</div>
                  <span style={{ fontSize:'12px', color:'#9ca3af' }}>{collapsed['listings'] ? '▶' : '▼'}</span>
                </div>
                {!collapsed['listings'] && <div style={{ ...card, marginBottom:'20px' }}>
                  <table style={tbl}>
                    <thead><tr><th style={th}>Listing</th><th style={th}>Structure</th><th style={th}>Asking Price</th><th style={th}>Status</th><th style={th}>Gross Comm.</th><th style={th}>Your 80%</th></tr></thead>
                    <tbody>{lists.filter(l => fv(l.fields,F.lists.status) === 'Active').map(l => (
                      <tr key={l.id} style={{ cursor:'pointer' }} onClick={() => { setView('listings'); setSelected(s => ({...s, listing:l})) }}>
                        <td style={td}><div style={{fontWeight:500}}>{fv(l.fields,F.lists.name)}</div></td>
                        <td style={{...td,color:'#6b7280'}}>{fv(l.fields,F.lists.type)}</td>
                        <td style={td}>{fmt$(l.fields[F.lists.price])}</td>
                        <td style={td}><Badge value={l.fields[F.lists.status]} /></td>
                        <td style={{...td,color:'#c69425',fontWeight:600}}>{fmt$(l.fields[F.lists.estComm])}</td>
                        <td style={{...td,color:'#316828',fontWeight:600}}>{fmt$((l.fields[F.lists.estComm]||0)*0.8)}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>}

                {/* Follow-ups due today */}
                {todayFU.length > 0 && (
                  <div style={{ marginBottom:'20px' }}>
                    <div style={{ fontSize:'12px', fontWeight:700, color:'#dc2626', textTransform:'uppercase', letterSpacing:'0.07em', marginBottom:'10px' }}>Follow-Ups Due Today ({todayFU.length})</div>
                    <div style={card}>
                      <table style={tbl}>
                        <thead><tr><th style={th}>Activity</th><th style={th}>Follow-Up Action</th><th style={th}>Date</th></tr></thead>
                        <tbody>{todayFU.map(a => (
                          <tr key={a.id}>
                            <td style={td}><div style={{fontWeight:500}}>{fv(a.fields,F.acts.desc)}</div></td>
                            <td style={{...td,color:'#6b7280'}}>{fv(a.fields,F.acts.fuAction)||'—'}</td>
                            <td style={{...td,color:'#dc2626'}}>{fv(a.fields,F.acts.fuDate)}</td>
                          </tr>
                        ))}</tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )
          })()}

          {/* Properties — stacked: Prospecting call sheet on top, pipeline below */}
          {!detail && view === 'properties' && (
            <div>
              {/* ── Prospecting Call Sheet ── */}
              <div style={{ marginBottom: '24px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
                  📞 Prospecting Call Sheet
                </div>
                <ProspectingPage
                  allData={allData}
                  onRefresh={onRefresh}
                  onSelectProperty={p => setSelected(s => ({...s, property: p}))}
                />
              </div>

              {/* ── Property Pipeline ── */}
              <div style={{ borderTop: '2px solid #e2dcc8', paddingTop: '20px' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
                  Property Pipeline
                </div>
                <div style={card}>
                  <table style={tbl}>
                    <thead><tr><th style={th}>Address</th><th style={th}>City</th><th style={th}>Attributes</th><th style={th}>Status</th><th style={th}>Acreage</th><th style={th}>SF</th></tr></thead>
                    <tbody>{filt(props,[F.props.addr,F.props.city]).map(r => (
                      <tr key={r.id} style={{ cursor:'pointer' }} onClick={() => setSelected(s => ({...s, property:r}))}>
                        <td style={td}><div style={{fontWeight:500}}>{fv(r.fields,F.props.addr)||'—'}</div></td>
                        <td style={td}>{fv(r.fields,F.props.city)||'—'}</td>
                        <td style={{...td,color:'#6b7280'}}>{fv(r.fields,F.props.attrs)||'—'}</td>
                        <td style={td}><Badge value={r.fields[F.props.status]} /></td>
                        <td style={td}>{r.fields[F.props.acreage]||'—'}</td>
                        <td style={td}>{r.fields[F.props.sf]?Number(r.fields[F.props.sf]).toLocaleString():'—'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Listings */}
          {!detail && view === 'listings' && (
            <div style={card}>
              <table style={tbl}>
                <thead><tr><th style={th}>Listing</th><th style={th}>Structure</th><th style={th}>Asking Price</th><th style={th}>Status</th><th style={th}>Offer Status</th><th style={th}>Est. Commission</th></tr></thead>
                <tbody>{filt(lists,[F.lists.name,F.lists.buyerTenant]).map(l => <tr key={l.id} style={{ cursor: 'pointer' }} onClick={() => setSelected(s => ({...s, listing:l}))}><td style={td}><div style={{fontWeight:500}}>{fv(l.fields,F.lists.name)||'—'}</div></td><td style={{...td,color:'#6b7280'}}>{fv(l.fields,F.lists.type)||'—'}</td><td style={td}>{fmt$(l.fields[F.lists.price])}</td><td style={td}><Badge value={l.fields[F.lists.status]} /></td><td style={td}><Badge value={l.fields[F.lists.offerStatus]} /></td><td style={{...td,color:'#c69425',fontWeight:600}}>{fmt$(l.fields[F.lists.estComm])}</td></tr>)}</tbody>
              </table>
            </div>
          )}

          {/* Deals */}
          {!detail && view === 'deals' && (
            <div>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '12px' }}>All Deals</div>
              {(() => {
                const groups = [...tenants.map(t => ({ key: t, label: t, deals: deals.filter(d => fv(d.fields, F.deals.clientName) === t) })),
                  { key: '__other__', label: 'Other / Unassigned', deals: deals.filter(d => !fv(d.fields, F.deals.clientName)) }
                ].filter(g => g.deals.length > 0)
                return groups.map(({ key, label, deals: tDeals }) => {
                const tActive = tDeals.filter(d => !['Executed','Dead'].includes(fv(d.fields, F.deals.stage)))
                const tPipe = tActive.reduce((s,d) => s + (d.fields[F.deals.estComm]||0), 0)
                return (
                  <div key={key} style={{ marginBottom: '20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: '#316828', cursor: key !== '__other__' ? 'pointer' : 'default', textDecoration: key !== '__other__' ? 'underline' : 'none', textDecorationColor: '#c69425' }} onClick={() => key !== '__other__' && setSelected(s => ({...s, tenant: key}))}>{label}</div>
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
              })})()}
            </div>
          )}

          {/* Contacts */}
          {!detail && view === 'contacts' && (
            <div style={card}>
              <table style={tbl}>
                <thead><tr><th style={th}>Name</th><th style={th}>Company</th><th style={th}>Role</th><th style={th}>Phone</th><th style={th}>Email</th></tr></thead>
                <tbody>{filt(conts,[F.conts.firstName,F.conts.lastName,F.conts.company]).map(c => <tr key={c.id}><td style={td}><div style={{fontWeight:500}}>{contName(c.fields)||'—'}</div></td><td style={td}>{fv(c.fields,F.conts.company)||'—'}</td><td style={{...td,color:'#6b7280'}}>{fv(c.fields,F.conts.role)||'—'}</td><td style={td}>{fv(c.fields,F.conts.phone)||'—'}</td><td style={{...td,color:'#6b7280'}}>{fv(c.fields,F.conts.email)||'—'}</td></tr>)}</tbody>
              </table>
            </div>
          )}

          {/* Activity / GTD */}
          {!detail && view === 'activities' && <GTDPage acts={acts} onRefresh={onRefresh} />}


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
            {[['deal','Deal'],['listing','Listing'],['property','Property'],['contact','Contact'],['activity','Activity']].map(([key, label]) => (
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
      {modal === 'property' && <Modal title="New Property" onClose={() => setModal(null)}><PropertyForm onSave={() => { setModal(null); onRefresh() }} onCancel={() => setModal(null)} /></Modal>}
      {modal === 'contact' && <Modal title="New Contact" onClose={() => setModal(null)}><ContactForm props={props} deals={deals} lists={lists} onSave={() => { setModal(null); onRefresh() }} onCancel={() => setModal(null)} /></Modal>}
      {modal === 'activity' && <Modal title="Log Activity" onClose={() => setModal(null)}><ActivityForm props={props} deals={deals} lists={lists} conts={conts} onSave={() => { setModal(null); onRefresh() }} onCancel={() => setModal(null)} /></Modal>}
    </div>
  )
}
