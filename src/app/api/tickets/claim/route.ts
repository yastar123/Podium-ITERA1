import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { prisma } from "@/lib/db"
import { nanoid } from "nanoid"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || session.user.role !== "STUDENT") {
      return NextResponse.json(
        { error: "Unauthorized - Only students can claim tickets" },
        { status: 401 }
      )
    }

    const { eventId } = await request.json()

    if (!eventId) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      )
    }

    // Check if event exists and is active
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      include: {
        _count: {
          select: { tickets: true }
        }
      }
    })

    if (!event) {
      return NextResponse.json(
        { error: "Event not found" },
        { status: 404 }
      )
    }

    if (!event.isActive) {
      return NextResponse.json(
        { error: "Event is not active" },
        { status: 400 }
      )
    }

    // Check if user already has a ticket for this event
    const existingTicket = await prisma.ticket.findFirst({
      where: {
        userId: session.user.id,
        eventId: eventId
      }
    })

    if (existingTicket) {
      return NextResponse.json(
        { error: "You already have a ticket for this event" },
        { status: 400 }
      )
    }

    // Check if quota is available (simple check without Redis atomic counter)
    if (event._count.tickets >= event.quota) {
      return NextResponse.json(
        { error: "Sorry, this event is full" },
        { status: 400 }
      )
    }

    // Generate unique ticket code
    const ticketCode = nanoid(10).toUpperCase()

    // Create the ticket
    const ticket = await prisma.ticket.create({
      data: {
        ticketCode,
        userId: session.user.id,
        eventId: eventId,
        status: "ACTIVE"
      },
      include: {
        event: true,
        user: {
          select: {
            name: true,
            email: true,
            nim: true
          }
        }
      }
    })

    return NextResponse.json({
      message: "Ticket claimed successfully!",
      ticket
    })
  } catch (error) {
    console.error("Error claiming ticket:", error)
    return NextResponse.json(
      { error: "Failed to claim ticket" },
      { status: 500 }
    )
  }
}