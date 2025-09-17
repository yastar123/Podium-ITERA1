"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import TicketValidator from "@/components/TicketValidator";

interface Event {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  eventDate: string;
  quota: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  _count: {
    tickets: number;
  };
}

interface TicketBatch {
  id: string;
  name: string;
  quota: number;
  available: number;
  startDate: string;
  endDate: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EventFormData {
  name: string;
  description: string;
  location: string;
  eventDate: string;
  quota: string;
  claimStartDate: string;
  claimEndDate: string;
}

interface BatchFormData {
  name: string;
  quota: string;
  startDate: string;
  endDate: string;
}

export default function AdminDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"events" | "batches">("events");
  const [events, setEvents] = useState<Event[]>([]);
  const [batches, setBatches] = useState<TicketBatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showCreateBatchForm, setShowCreateBatchForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [editingBatch, setEditingBatch] = useState<TicketBatch | null>(null);
  const [formData, setFormData] = useState<EventFormData>({
    name: "",
    description: "",
    location: "",
    eventDate: "",
    quota: "",
    claimStartDate: "",
    claimEndDate: "",
  });
  const [batchFormData, setBatchFormData] = useState<BatchFormData>({
    name: "",
    quota: "",
    startDate: "",
    endDate: "",
  });
  const [formLoading, setFormLoading] = useState(false);

  useEffect(() => {
    if (status === "loading") return;

    if (!session || session.user.role !== "ADMIN") {
      router.push("/auth/signin");
      return;
    }

    fetchEvents();
    if (activeTab === "batches") {
      fetchBatches();
    }
  }, [session, status, router, activeTab]);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/events/admin");

      if (response.ok) {
        const data = await response.json();
        setEvents(data);
        console.log("Loaded events:", data.length);
      } else {
        console.error("Failed to fetch events:", response.status);
        alert("Gagal memuat data events");
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      alert("Terjadi kesalahan saat memuat data");
    } finally {
      setLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const response = await fetch("/api/ticket-batches");

      if (response.ok) {
        const data = await response.json();
        setBatches(data);
        console.log("Loaded batches:", data.length);
      } else {
        console.error("Failed to fetch batches:", response.status);
        alert("Gagal memuat data batch tiket");
      }
    } catch (error) {
      console.error("Error fetching batches:", error);
      alert("Terjadi kesalahan saat memuat data batch");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      location: "",
      eventDate: "",
      quota: "",
      claimStartDate: "",
      claimEndDate: "",
    });
    setEditingEvent(null);
    setShowCreateForm(false);
  };

  const resetBatchForm = () => {
    setBatchFormData({
      name: "",
      quota: "",
      startDate: "",
      endDate: "",
    });
    setEditingBatch(null);
    setShowCreateBatchForm(false);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const response = await fetch("/api/events/admin", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Event dan batch tiket berhasil dibuat! 🎉");
        resetForm();
        fetchEvents();
        if (activeTab === "batches") {
          fetchBatches();
        }
      } else {
        alert(data.error || "Gagal membuat event");
      }
    } catch (error) {
      console.error("Error creating event:", error);
      alert("Terjadi kesalahan saat membuat event");
    } finally {
      setFormLoading(false);
    }
  };

  const handleCreateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);

    try {
      const response = await fetch("/api/ticket-batches", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(batchFormData),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Batch tiket berhasil dibuat! 🎫");
        resetBatchForm();
        fetchBatches();
      } else {
        alert(data.error || "Gagal membuat batch tiket");
      }
    } catch (error) {
      console.error("Error creating batch:", error);
      alert("Terjadi kesalahan saat membuat batch");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEvent) return;

    setFormLoading(true);

    try {
      const response = await fetch("/api/events/admin", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingEvent.id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Event berhasil diupdate! ✅");
        resetForm();
        fetchEvents();
        if (activeTab === "batches") {
          fetchBatches();
        }
      } else {
        alert(data.error || "Gagal mengupdate event");
      }
    } catch (error) {
      console.error("Error updating event:", error);
      alert("Terjadi kesalahan saat mengupdate event");
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdateBatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBatch) return;

    setFormLoading(true);

    try {
      const response = await fetch("/api/ticket-batches", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: editingBatch.id,
          ...batchFormData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert("Batch berhasil diupdate! ✅");
        resetBatchForm();
        fetchBatches();
      } else {
        alert(data.error || "Gagal mengupdate batch");
      }
    } catch (error) {
      console.error("Error updating batch:", error);
      alert("Terjadi kesalahan saat mengupdate batch");
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    if (
      !confirm(
        "Apakah Anda yakin ingin menghapus event ini? Batch tiket terkait juga akan dihapus."
      )
    )
      return;

    try {
      const response = await fetch(`/api/events/admin?id=${eventId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        alert("Event dan batch tiket berhasil dihapus! 🗑️");
        fetchEvents();
        if (activeTab === "batches") {
          fetchBatches();
        }
      } else {
        alert(data.error || "Gagal menghapus event");
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      alert("Terjadi kesalahan saat menghapus event");
    }
  };

  const handleDeleteBatch = async (batchId: string) => {
    if (!confirm("Apakah Anda yakin ingin menghapus batch ini?")) return;

    try {
      const response = await fetch(`/api/ticket-batches?id=${batchId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        alert("Batch berhasil dihapus! 🗑️");
        fetchBatches();
      } else {
        alert(data.error || "Gagal menghapus batch");
      }
    } catch (error) {
      console.error("Error deleting batch:", error);
      alert("Terjadi kesalahan saat menghapus batch");
    }
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);

    // Calculate default claim dates if not set
    const eventDate = new Date(event.eventDate);
    const defaultClaimStart = new Date();
    const defaultClaimEnd = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before event

    setFormData({
      name: event.name,
      description: event.description || "",
      location: event.location || "",
      eventDate: event.eventDate.split("T")[0],
      quota: event.quota.toString(),
      claimStartDate: defaultClaimStart.toISOString().split("T")[0],
      claimEndDate: defaultClaimEnd.toISOString().split("T")[0],
    });
    setShowCreateForm(true);
  };

  const handleEditBatch = (batch: TicketBatch) => {
    setEditingBatch(batch);
    setBatchFormData({
      name: batch.name,
      quota: batch.quota.toString(),
      startDate: batch.startDate.split("T")[0],
      endDate: batch.endDate.split("T")[0],
    });
    setShowCreateBatchForm(true);
  };

  const toggleEventStatus = async (event: Event) => {
    try {
      const response = await fetch("/api/events/admin", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: event.id,
          isActive: !event.isActive,
        }),
      });

      if (response.ok) {
        alert(
          `Event berhasil di${!event.isActive ? "aktifkan" : "nonaktifkan"}!`
        );
        fetchEvents();
      } else {
        alert("Gagal mengubah status event");
      }
    } catch (error) {
      console.error("Error toggling event status:", error);
      alert("Terjadi kesalahan");
    }
  };

  const toggleBatchStatus = async (batch: TicketBatch) => {
    try {
      const response = await fetch("/api/ticket-batches", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: batch.id,
          isActive: !batch.isActive,
        }),
      });

      if (response.ok) {
        alert(
          `Batch berhasil di${!batch.isActive ? "aktifkan" : "nonaktifkan"}!`
        );
        fetchBatches();
      } else {
        alert("Gagal mengubah status batch");
      }
    } catch (error) {
      console.error("Error toggling batch status:", error);
      alert("Terjadi kesalahan");
    }
  };

  if (status === "loading" || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Memuat...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 to-blue-100">
      <nav className="bg-white shadow-sm border-b">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-800">
            🎫 Admin Dashboard
          </h1>
          <div className="flex items-center space-x-4">
            <span className="text-gray-600">Admin: {session?.user?.name}</span>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition-colors"
            >
              Logout
            </button>
          </div>
        </div>
      </nav>

      <div className="container mx-auto px-4 py-8">
        {/* Tabs */}
        <div className="flex space-x-1 mb-8">
          <button
            onClick={() => setActiveTab("events")}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === "events"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            📅 Manajemen Events
          </button>
          <button
            onClick={() => setActiveTab("batches")}
            className={`px-6 py-3 rounded-lg font-medium transition-colors ${
              activeTab === "batches"
                ? "bg-blue-600 text-white"
                : "bg-white text-gray-600 hover:bg-gray-50"
            }`}
          >
            🎫 Manajemen Batch Tiket
          </button>
        </div>

        {/* Events Tab */}
        {activeTab === "events" && (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">
                📅 Daftar Events
              </h2>
              <button
                onClick={() => setShowCreateForm(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                + Tambah Event Baru
              </button>
            </div>

            {/* Events List */}
            {events.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="text-6xl mb-4">📅</div>
                <p className="text-gray-600 text-lg">
                  Tidak ada event yang tersedia
                </p>
                <p className="text-gray-500">
                  Klik "Tambah Event Baru" untuk membuat event pertama
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map((event) => (
                  <div
                    key={event.id}
                    className="bg-white rounded-xl shadow-lg p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-lg text-gray-800">
                        {event.name}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          event.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {event.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p>
                        <strong>Deskripsi:</strong>{" "}
                        {event.description || "Tidak ada deskripsi"}
                      </p>
                      <p>
                        <strong>Lokasi:</strong> {event.location || "TBA"}
                      </p>
                      <p>
                        <strong>Tanggal Event:</strong>{" "}
                        {new Date(event.eventDate).toLocaleDateString("id-ID")}
                      </p>
                      <p>
                        <strong>Kuota:</strong> {event.quota} peserta
                      </p>
                      <p>
                        <strong>Tiket Terjual:</strong> {event._count.tickets}
                      </p>
                      <p>
                        <strong>Sisa Slot:</strong>{" "}
                        {event.quota - event._count.tickets}
                      </p>

                      {/* Progress Bar */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>
                            {Math.round(
                              (event._count.tickets / event.quota) * 100
                            )}
                            %
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${
                                (event._count.tickets / event.quota) * 100
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditEvent(event)}
                        className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleEventStatus(event)}
                        className={`flex-1 py-2 px-3 rounded-lg transition-colors text-sm ${
                          event.isActive
                            ? "bg-yellow-600 text-white hover:bg-yellow-700"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      >
                        {event.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button
                        onClick={() => handleDeleteEvent(event.id)}
                        className="bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors text-sm"
                        disabled={event._count.tickets > 0}
                        title={
                          event._count.tickets > 0
                            ? "Tidak bisa dihapus, ada tiket yang sudah terjual"
                            : "Hapus event"
                        }
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        <TicketValidator />

        {/* Batches Tab */}
        {activeTab === "batches" && (
          <>
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold text-gray-800">
                🎫 Daftar Batch Tiket
              </h2>
              <button
                onClick={() => setShowCreateBatchForm(true)}
                className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors font-medium"
              >
                + Tambah Batch Manual
              </button>
            </div>

            {/* Batches List */}
            {batches.length === 0 ? (
              <div className="bg-white rounded-xl shadow-lg p-8 text-center">
                <div className="text-6xl mb-4">🎫</div>
                <p className="text-gray-600 text-lg">
                  Tidak ada batch tiket yang tersedia
                </p>
                <p className="text-gray-500">
                  Batch tiket akan otomatis terbuat saat membuat event baru
                </p>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {batches.map((batch) => (
                  <div
                    key={batch.id}
                    className="bg-white rounded-xl shadow-lg p-6"
                  >
                    <div className="flex justify-between items-start mb-4">
                      <h3 className="font-semibold text-lg text-gray-800">
                        {batch.name}
                      </h3>
                      <span
                        className={`px-3 py-1 rounded-full text-sm font-medium ${
                          batch.isActive
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {batch.isActive ? "Aktif" : "Nonaktif"}
                      </span>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600 mb-4">
                      <p>
                        <strong>Total Kuota:</strong> {batch.quota} tiket
                      </p>
                      <p>
                        <strong>Tersedia:</strong> {batch.available} tiket
                      </p>
                      <p>
                        <strong>Terjual:</strong>{" "}
                        {batch.quota - batch.available} tiket
                      </p>
                      <p>
                        <strong>Mulai:</strong>{" "}
                        {new Date(batch.startDate).toLocaleDateString("id-ID")}
                      </p>
                      <p>
                        <strong>Berakhir:</strong>{" "}
                        {new Date(batch.endDate).toLocaleDateString("id-ID")}
                      </p>

                      {/* Status */}
                      <div className="mt-2">
                        {new Date() < new Date(batch.startDate) && (
                          <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                            📅 Belum Dimulai
                          </span>
                        )}
                        {new Date() >= new Date(batch.startDate) &&
                          new Date() <= new Date(batch.endDate) && (
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                              🟢 Sedang Berlangsung
                            </span>
                          )}
                        {new Date() > new Date(batch.endDate) && (
                          <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-xs">
                            ⏰ Sudah Berakhir
                          </span>
                        )}
                      </div>

                      {/* Progress */}
                      <div className="mt-3">
                        <div className="flex justify-between text-xs text-gray-500 mb-1">
                          <span>Progress</span>
                          <span>
                            {Math.round(
                              ((batch.quota - batch.available) / batch.quota) *
                                100
                            )}
                            %
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{
                              width: `${
                                ((batch.quota - batch.available) /
                                  batch.quota) *
                                100
                              }%`,
                            }}
                          ></div>
                        </div>
                      </div>
                    </div>

                    <div className="flex space-x-2">
                      <button
                        onClick={() => handleEditBatch(batch)}
                        className="flex-1 bg-blue-600 text-white py-2 px-3 rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => toggleBatchStatus(batch)}
                        className={`flex-1 py-2 px-3 rounded-lg transition-colors text-sm ${
                          batch.isActive
                            ? "bg-yellow-600 text-white hover:bg-yellow-700"
                            : "bg-green-600 text-white hover:bg-green-700"
                        }`}
                      >
                        {batch.isActive ? "Nonaktifkan" : "Aktifkan"}
                      </button>
                      <button
                        onClick={() => handleDeleteBatch(batch.id)}
                        className="bg-red-600 text-white py-2 px-3 rounded-lg hover:bg-red-700 transition-colors text-sm"
                        disabled={batch.quota - batch.available > 0}
                        title={
                          batch.quota - batch.available > 0
                            ? "Tidak bisa dihapus, ada tiket yang sudah terjual"
                            : "Hapus batch"
                        }
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* Create/Edit Event Form Modal */}
        {showCreateForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">
                    {editingEvent ? "Edit Event" : "Tambah Event Baru"}
                  </h3>
                  <button
                    onClick={resetForm}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <form
                  onSubmit={
                    editingEvent ? handleUpdateEvent : handleCreateEvent
                  }
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nama Event *
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) =>
                          setFormData({ ...formData, name: e.target.value })
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Masukkan nama event"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Deskripsi
                      </label>
                      <textarea
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Masukkan deskripsi event"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tanggal Event *
                      </label>
                      <input
                        type="date"
                        required
                        value={formData.eventDate}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            eventDate: e.target.value,
                          })
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kuota Peserta *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={formData.quota}
                        onChange={(e) =>
                          setFormData({ ...formData, quota: e.target.value })
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Masukkan jumlah kuota"
                      />
                    </div>

                    {/* NEW SECTION: Periode Claim Tiket */}
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-gray-800 mb-3 flex items-center">
                        🎫 Pengaturan Claim Tiket
                      </h4>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Mulai Claim *
                          </label>
                          <input
                            type="date"
                            required
                            value={formData.claimStartDate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                claimStartDate: e.target.value,
                              })
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Batas Claim *
                          </label>
                          <input
                            type="date"
                            required
                            value={formData.claimEndDate}
                            onChange={(e) =>
                              setFormData({
                                ...formData,
                                claimEndDate: e.target.value,
                              })
                            }
                            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          />
                        </div>
                      </div>

                      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mt-3">
                        <div className="text-blue-700 text-sm">
                          <strong>📋 Informasi:</strong>
                          <ul className="mt-1 space-y-1">
                            <li>
                              • Batch tiket akan otomatis dibuat dengan kuota
                              yang sama
                            </li>
                            <li>
                              • Mahasiswa hanya bisa claim tiket pada periode
                              yang ditentukan
                            </li>
                            <li>
                              • Setelah batas claim, tiket tidak bisa di-claim
                              lagi
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={resetForm}
                      className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {formLoading
                        ? "Loading..."
                        : editingEvent
                        ? "Update Event"
                        : "Buat Event & Batch Tiket"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Create/Edit Batch Form Modal */}
        {showCreateBatchForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-gray-800">
                    {editingBatch
                      ? "Edit Batch Tiket"
                      : "Tambah Batch Tiket Manual"}
                  </h3>
                  <button
                    onClick={resetBatchForm}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ✕
                  </button>
                </div>

                <form
                  onSubmit={
                    editingBatch ? handleUpdateBatch : handleCreateBatch
                  }
                >
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Nama Batch *
                      </label>
                      <input
                        type="text"
                        required
                        value={batchFormData.name}
                        onChange={(e) =>
                          setBatchFormData({
                            ...batchFormData,
                            name: e.target.value,
                          })
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Contoh: Early Bird, Regular, Last Minute"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Kuota Tiket *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        value={batchFormData.quota}
                        onChange={(e) =>
                          setBatchFormData({
                            ...batchFormData,
                            quota: e.target.value,
                          })
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Masukkan jumlah tiket yang tersedia"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tanggal Mulai *
                      </label>
                      <input
                        type="date"
                        required
                        value={batchFormData.startDate}
                        onChange={(e) =>
                          setBatchFormData({
                            ...batchFormData,
                            startDate: e.target.value,
                          })
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Tanggal Berakhir *
                      </label>
                      <input
                        type="date"
                        required
                        value={batchFormData.endDate}
                        onChange={(e) =>
                          setBatchFormData({
                            ...batchFormData,
                            endDate: e.target.value,
                          })
                        }
                        className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>

                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <div className="flex items-start">
                        <div className="text-yellow-600 text-sm">
                          <strong>💡 Tips untuk Batch Manual:</strong>
                          <ul className="mt-2 space-y-1">
                            <li>
                              • Gunakan untuk membuat periode claim tambahan
                            </li>
                            <li>
                              • Pastikan tidak bertumpang tindih dengan batch
                              otomatis
                            </li>
                            <li>
                              • Cocok untuk early bird atau last minute
                              registration
                            </li>
                            <li>
                              • Batch manual tidak terikat dengan event tertentu
                            </li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={resetBatchForm}
                      className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg hover:bg-gray-400 transition-colors"
                    >
                      Batal
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="flex-1 bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                    >
                      {formLoading
                        ? "Loading..."
                        : editingBatch
                        ? "Update Batch"
                        : "Buat Batch Manual"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
