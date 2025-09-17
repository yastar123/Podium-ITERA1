// src/app/api/events/admin/route.ts
import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { nanoid } from "nanoid" // Import nanoid for ID generation

// GET - Fetch all events for admin
export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const events = await prisma.event.findMany({
      include: {
        _count: {
          select: { tickets: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(events)
  } catch (error) {
    console.error("Error fetching events:", error)
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    )
  }
}

// POST - Create new event with automatic batch creation
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const { 
      name, 
      description, 
      location, 
      eventDate, 
      quota,
      claimStartDate,
      claimEndDate 
    } = await request.json()

    // Validation
    if (!name || !eventDate || !quota || !claimStartDate || !claimEndDate) {
      return NextResponse.json(
        { error: "Required fields: name, eventDate, quota, claimStartDate, claimEndDate" },
        { status: 400 }
      )
    }

    // Validate dates
    const eventDateTime = new Date(eventDate)
    const claimStart = new Date(claimStartDate)
    const claimEnd = new Date(claimEndDate)

    if (claimStart >= claimEnd) {
      return NextResponse.json(
        { error: "Tanggal mulai claim harus lebih awal dari batas claim" },
        { status: 400 }
      )
    }

    if (claimEnd > eventDateTime) {
      return NextResponse.json(
        { error: "Batas claim tidak boleh melebihi tanggal event" },
        { status: 400 }
      )
    }

    // Create event and batch in transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the event
      const newEvent = await tx.event.create({
        data: {
          name,
          description: description || null,
          location: location || null,
          eventDate: new Date(eventDate),
          quota: parseInt(quota),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      })

      // FIXED: Generate ID for ticket batch
      const batchId = nanoid() // or use crypto.randomUUID() if available

      // Automatically create a ticket batch for this event
      const batch = await tx.ticket_batches.create({
        data: {
          id: batchId, // ✅ FIXED: Add the missing ID
          name: `${name} - Batch Utama`,
          quota: parseInt(quota),
          available: parseInt(quota),
          startDate: new Date(claimStartDate),
          endDate: new Date(claimEndDate),
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        }
      })

      return { event: newEvent, batch }
    })

    return NextResponse.json({
      message: "Event dan batch tiket berhasil dibuat!",
      event: result.event,
      batch: result.batch
    })
  } catch (error) {
    console.error("Error creating event:", error)
    return NextResponse.json(
      { error: "Failed to create event and batch" },
      { status: 500 }
    )
  }
}

// PUT - Update event
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const { 
      id, 
      name, 
      description, 
      location, 
      eventDate, 
      quota, 
      isActive,
      claimStartDate,
      claimEndDate
    } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      )
    }

    // If updating claim dates, validate them
    if (claimStartDate && claimEndDate) {
      const claimStart = new Date(claimStartDate)
      const claimEnd = new Date(claimEndDate)
      const eventDateTime = eventDate ? new Date(eventDate) : null

      if (claimStart >= claimEnd) {
        return NextResponse.json(
          { error: "Tanggal mulai claim harus lebih awal dari batas claim" },
          { status: 400 }
        )
      }

      if (eventDateTime && claimEnd > eventDateTime) {
        return NextResponse.json(
          { error: "Batas claim tidak boleh melebihi tanggal event" },
          { status: 400 }
        )
      }
    }

    const result = await prisma.$transaction(async (tx) => {
      // Update the event
      const updatedEvent = await tx.event.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(description !== undefined && { description: description || null }),
          ...(location !== undefined && { location: location || null }),
          ...(eventDate && { eventDate: new Date(eventDate) }),
          ...(quota && { quota: parseInt(quota) }),
          ...(isActive !== undefined && { isActive }),
          updatedAt: new Date(),
        }
      })

      // If updating claim dates or quota, update the associated batch
      if (claimStartDate || claimEndDate || quota) {
        // Find the main batch for this event (assuming it has the event name in it)
        const mainBatch = await tx.ticket_batches.findFirst({
          where: {
            name: {
              contains: updatedEvent.name
            }
          }
        })

        if (mainBatch) {
          // Calculate new available count if quota changed
          let newAvailable = mainBatch.available
          if (quota) {
            const usedTickets = mainBatch.quota - mainBatch.available
            newAvailable = parseInt(quota) - usedTickets
            
            // Ensure available count doesn't go negative
            if (newAvailable < 0) {
              throw new Error("New quota cannot be less than already sold tickets")
            }
          }

          await tx.ticket_batches.update({
            where: { id: mainBatch.id },
            data: {
              ...(quota && { 
                quota: parseInt(quota),
                available: newAvailable
              }),
              ...(claimStartDate && { startDate: new Date(claimStartDate) }),
              ...(claimEndDate && { endDate: new Date(claimEndDate) }),
              updatedAt: new Date(),
            }
          })
        }
      }

      return updatedEvent
    })

    return NextResponse.json(result)
  } catch (error: any) {
    console.error("Error updating event:", error)
    
    // Handle specific error messages
    if (error.message?.includes("New quota cannot be less than already sold tickets")) {
      return NextResponse.json(
        { error: "Kuota baru tidak boleh lebih kecil dari tiket yang sudah terjual" },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: "Failed to update event" },
      { status: 500 }
    )
  }
}

// DELETE - Delete event and its batch
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)

    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { error: "Unauthorized - Admin access required" },
        { status: 401 }
      )
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json(
        { error: "Event ID is required" },
        { status: 400 }
      )
    }

    // Check if event has any tickets
    const ticketCount = await prisma.ticket.count({
      where: { eventId: id }
    })

    if (ticketCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete event with claimed tickets" },
        { status: 400 }
      )
    }

    await prisma.$transaction(async (tx) => {
      // Get event name first
      const eventToDelete = await tx.event.findUnique({ 
        where: { id },
        select: { name: true }
      })

      if (eventToDelete) {
        // Delete associated batches first
        await tx.ticket_batches.deleteMany({
          where: {
            name: {
              contains: eventToDelete.name
            }
          }
        })
      }

      // Then delete the event
      await tx.event.delete({
        where: { id }
      })
    })

    return NextResponse.json({ message: "Event and associated batches deleted successfully" })
  } catch (error) {
    console.error("Error deleting event:", error)
    return NextResponse.json(
      { error: "Failed to delete event" },
      { status: 500 }
    )
  }
}