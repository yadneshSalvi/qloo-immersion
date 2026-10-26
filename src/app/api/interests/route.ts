import { apiLearner } from '@/server/auth';
import { getLiveOverview } from '@/server/live-store';
import { apiError, privateHeaders } from '@/server/http';
export async function GET() {
  try { return Response.json(await getLiveOverview((await apiLearner()).id), { headers: privateHeaders }); }
  catch (error) { return apiError(error); }
}
