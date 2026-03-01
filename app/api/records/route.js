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
    const record = await base(TABLE_IDS[table]).create(fields)
    return Response.json({ id: record.id, fields: record.fields })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}

export async function PATCH(request) {
  try {
    const { table, id, fields } = await request.json()
    if (!TABLE_IDS[table]) return Response.json({ error: 'Invalid table' }, { status: 400 })
    const record = await base(TABLE_IDS[table]).update(id, fields)
    return Response.json({ id: record.id, fields: record.fields })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
