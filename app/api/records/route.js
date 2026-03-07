import Airtable from 'airtable'

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

const TABLE_IDS = {
  props: 'tblwfNyQzKYx4HK0a',
  lists: 'tblNsZAT6ASF5WBsk',
  deals: 'tblQ76Ky1CK0oQTtI',
  conts: 'tblloysg41sLmT5yc',
  acts:  'tbl9YuAGBHkJBITMK',
}

export async function POST(request) {
  try {
    const { table, fields } = await request.json()
    if (!TABLE_IDS[table]) return Response.json({ error: 'Invalid table' }, { status: 400 })
    console.log('[API POST]', table, JSON.stringify(fields))
    const record = await base(TABLE_IDS[table]).create(fields)
    return Response.json({ id: record.id, fields: record.fields })
  } catch (err) {
    const detail = err.error || err.statusCode ? `[${err.statusCode}] ${err.error}: ${err.message}` : err.message
    console.error('[API POST error]', detail, JSON.stringify(err))
    return Response.json({ error: detail }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { table, id, fields } = await request.json()
    if (!TABLE_IDS[table]) return Response.json({ error: 'Invalid table' }, { status: 400 })
    console.log('[API PATCH]', table, id, JSON.stringify(fields))
    const record = await base(TABLE_IDS[table]).update(id, fields)
    return Response.json({ id: record.id, fields: record.fields })
  } catch (err) {
    const detail = err.error || err.statusCode ? `[${err.statusCode}] ${err.error}: ${err.message}` : err.message
    console.error('[API PATCH error]', detail, JSON.stringify(err))
    return Response.json({ error: detail }, { status: 500 })
  }
}

export async function DELETE(request) {
  try {
    const { table, id } = await request.json()
    if (!TABLE_IDS[table]) return Response.json({ error: 'Invalid table' }, { status: 400 })
    console.log('[API DELETE]', table, id)
    await base(TABLE_IDS[table]).destroy(id)
    return Response.json({ deleted: true })
  } catch (err) {
    const detail = err.error || err.statusCode ? `[${err.statusCode}] ${err.error}: ${err.message}` : err.message
    console.error('[API DELETE error]', detail, JSON.stringify(err))
    return Response.json({ error: detail }, { status: 500 })
  }
}
