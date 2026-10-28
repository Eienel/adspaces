import { bookingActionSchema } from "@adspaces/shared";
import { actOnBooking, getBookingForUser } from "@/lib/bookings";
import { HttpError, isUuid, requireUserId, route } from "@/lib/session";

type Ctx = { params: Promise<{ id: string }> };

async function bookingId(params: Ctx["params"]): Promise<string> {
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError(404, "Booking not found");
  return id;
}

export const GET = route(async (_req: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const booking = await getBookingForUser(userId, await bookingId(params));
  if (!booking) throw new HttpError(404, "Booking not found");
  return Response.json(booking);
});

export const POST = route(async (req: Request, { params }: Ctx) => {
  const userId = await requireUserId();
  const { action } = bookingActionSchema.parse(await req.json());
  return Response.json(await actOnBooking(userId, await bookingId(params), action));
});
