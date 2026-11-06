const { admin, json } = require('./_supabase');

const TOTAL_SLOTS = 30;

exports.handler = async event => {
  if (event.httpMethod !== 'GET') return json(405, { error: 'Method not allowed' });
  try {
    const { count, error } = await admin()
      .from('module_unlocks')
      .select('module_key', { count: 'exact', head: true })
      .eq('module_key', 'ai-influencer-course');
    if (error) throw error;
    const sold = Math.max(0, Number(count || 0));
    return json(200, {
      total: TOTAL_SLOTS,
      sold,
      remaining: Math.max(0, TOTAL_SLOTS - sold),
    });
  } catch (error) {
    console.error('[Influencer offer status]', error.message);
    return json(200, { total: TOTAL_SLOTS, sold: 0, remaining: TOTAL_SLOTS });
  }
};
