import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { ticketCode } = await req.json();

    if (!ticketCode) {
      return NextResponse.json(
        { success: false, message: "❌ Kode tiket wajib diisi" },
        { status: 400 }
      );
    }

    const ticket = await prisma.ticket.findUnique({
      where: { ticketCode },
    });

    if (!ticket) {
      return NextResponse.json(
        { success: false, message: "❌ Tiket tidak ditemukan" },
        { status: 404 }
      );
    }

    if (ticket.status === "USED") {
      return NextResponse.json(
        { success: false, message: "⚠️ Tiket sudah digunakan" },
        { status: 400 }
      );
    }

    // Update tiket jadi USED
    await prisma.ticket.update({
      where: { id: ticket.id },
      data: {
        status: "USED",
        attendedAt: new Date(),
      },
    });

    return NextResponse.json(
      { success: true, message: "✅ Tiket valid dan sudah ditandai digunakan" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Validate Ticket Error:", error);
    return NextResponse.json(
      { success: false, message: "❌ Internal server error" },
      { status: 500 }
    );
  }
}
