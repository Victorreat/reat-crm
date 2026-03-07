import Airtable from 'airtable'

export const dynamic = 'force-dynamic'

const base = new Airtable({ apiKey: process.env.AIRTABLE_API_KEY }).base(process.env.AIRTABLE_BASE_ID)

const TABLE_IDS = {
  props: 'tblwfNyQzKYx4HK0a',
  lists: 'tblNsZAT6ASF5WBsk',
  deals: 'tblQ76Ky1CK0oQTtI',
  conts: 'tblloysg41sLmT5yc',
  acts:  'tbl9YuAGBHkJBITMK',
}

async function fetchTable(tableId) {
  const recs = await base(tableId).select({ pageSize: 100 }).all()
  return recs.map(r => ({ id: r.id, fields: r.fields }))
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url)
    const table = searchParams.get('table')

    if (table && TABLE_IDS[table]) {
      const records = await fetchTable(TABLE_IDS[table])
      return Response.json({ records })
    }

    // Fetch all tables in parallel
    const [props, lists, deals, conts, acts] = await Promise.all([
      fetchTable(TABLE_IDS.props),
      fetchTable(TABLE_IDS.lists),
      fetchTable(TABLE_IDS.deals),
      fetchTable(TABLE_IDS.conts),
      fetchTable(TABLE_IDS.acts),
    ])

    return Response.json({ props, lists, deals, conts, acts })
  } catch (err) {
    return Response.json({ error: err.message }, { status: 500 })
  }
}
