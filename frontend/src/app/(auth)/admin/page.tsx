"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Users,
  Activity,
  BookOpen,
  HelpCircle,
  Shield,
  CheckCircle,
  XCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api";
import { useAuthStore } from "@/stores/auth-store";

// ── Types ──────────────────────────────────────────────────────

interface Stats {
  total_users: number;
  active_today: number;
  total_sessions: number;
  total_answers: number;
  exams_count: number;
  concepts_count: number;
  questions_count: number;
}

interface AdminUserRow {
  id: string;
  email: string;
  display_name: string | null;
  plan: string;
  plan_expires_at: string | null;
  is_email_verified: boolean;
  is_admin: boolean;
  created_at: string | null;
  last_login_at: string | null;
  enrollments_count: number;
}

interface ExamRow {
  id: string;
  name: string;
  code: string | null;
  concepts_count: number;
  questions_count: number;
  enrolled_users_count: number;
}

interface QuestionRow {
  id: string;
  stem: string;
  type: string;
  difficulty: number | null;
  domain_id: string;
  review_status: string;
}

// ── Component ──────────────────────────────────────────────────

export default function AdminPage() {
  const router = useRouter();
  const { user } = useAuthStore();

  // State
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersPage, setUsersPage] = useState(0);
  const [exams, setExams] = useState<ExamRow[]>([]);
  const [questions, setQuestions] = useState<QuestionRow[]>([]);
  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"users" | "exams" | "questions">(
    "users"
  );

  const USERS_PER_PAGE = 20;

  // Redirect non-admin users
  useEffect(() => {
    if (user && !user.is_admin) {
      router.push("/dashboard");
    }
  }, [user, router]);

  // Load initial data
  useEffect(() => {
    async function load() {
      try {
        const [statsData, usersData, examsData] = await Promise.all([
          api.getAdminStats(),
          api.getAdminUsers(USERS_PER_PAGE, 0),
          api.getAdminExams(),
        ]);
        setStats(statsData);
        setUsers(usersData.users);
        setUsersTotal(usersData.total);
        setExams(examsData);
      } catch (err) {
        console.error("Failed to load admin data:", err);
      } finally {
        setLoading(false);
      }
    }
    if (user?.is_admin) {
      load();
    }
  }, [user]);

  // Pagination
  const loadUsersPage = useCallback(
    async (page: number) => {
      try {
        const data = await api.getAdminUsers(
          USERS_PER_PAGE,
          page * USERS_PER_PAGE
        );
        setUsers(data.users);
        setUsersTotal(data.total);
        setUsersPage(page);
      } catch (err) {
        console.error("Failed to load users:", err);
      }
    },
    []
  );

  // Change user plan
  const handleChangePlan = async (userId: string, plan: string, expiresAt?: string) => {
    // If selecting a paid plan without expiry, prompt for date
    if (plan !== "free" && !expiresAt) {
      const date = prompt("Set plan expiry date (YYYY-MM-DD):",
        new Date(Date.now() + (plan === "single" ? 180 : 365) * 86400000).toISOString().split("T")[0]);
      if (!date) return;
      expiresAt = date;
    }
    try {
      const result = await api.updateUserPlan(userId, plan, plan === "free" ? undefined : expiresAt);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, plan: result.plan, plan_expires_at: result.plan_expires_at } : u
        )
      );
    } catch (err) {
      console.error("Failed to update plan:", err);
    }
  };

  // Delete user
  const handleDeleteUser = async (userId: string, email: string) => {
    if (!confirm(`Delete user ${email}? This cannot be undone.`)) return;
    try {
      await api.deleteUser(userId);
      setUsers((prev) => prev.filter((u) => u.id !== userId));
      setUsersTotal((prev) => prev - 1);
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete user");
    }
  };

  // Toggle admin
  const handleToggleAdmin = async (userId: string) => {
    try {
      const result = await api.toggleUserAdmin(userId);
      setUsers((prev) =>
        prev.map((u) =>
          u.id === userId ? { ...u, is_admin: result.is_admin } : u
        )
      );
    } catch (err) {
      console.error("Failed to toggle admin:", err);
    }
  };

  // Load questions for exam
  const handleSelectExam = async (examId: string) => {
    setSelectedExamId(examId);
    setActiveTab("questions");
    try {
      const data = await api.getAdminQuestions(examId);
      setQuestions(data);
    } catch (err) {
      console.error("Failed to load questions:", err);
    }
  };

  // Update question status
  const handleUpdateStatus = async (questionId: string, newStatus: string) => {
    try {
      const result = await api.updateQuestionStatus(questionId, newStatus);
      setQuestions((prev) =>
        prev.map((q) =>
          q.id === questionId
            ? { ...q, review_status: result.review_status }
            : q
        )
      );
    } catch (err) {
      console.error("Failed to update question status:", err);
    }
  };

  if (!user?.is_admin) {
    return null;
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent" />
      </div>
    );
  }

  const totalPages = Math.ceil(usersTotal / USERS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="h-7 w-7 text-amber-500" />
        <h1 className="text-2xl font-bold text-stone-900">Admin Dashboard</h1>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard
            icon={<Users className="h-5 w-5 text-amber-500" />}
            label="Total Users"
            value={stats.total_users}
          />
          <StatCard
            icon={<Activity className="h-5 w-5 text-green-500" />}
            label="Active Today"
            value={stats.active_today}
          />
          <StatCard
            icon={<BookOpen className="h-5 w-5 text-blue-500" />}
            label="Total Sessions"
            value={stats.total_sessions}
          />
          <StatCard
            icon={<HelpCircle className="h-5 w-5 text-purple-500" />}
            label="Total Questions"
            value={stats.questions_count}
          />
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-1 rounded-lg bg-stone-200 p-1">
        {(["users", "exams", "questions"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 rounded-md px-4 py-2 text-sm font-medium capitalize transition-colors ${
              activeTab === tab
                ? "bg-white text-stone-900 shadow-sm"
                : "text-stone-500 hover:text-stone-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Users Table */}
      {activeTab === "users" && (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left">
                  <th className="px-4 py-3 font-medium text-stone-600">
                    Email
                  </th>
                  <th className="px-4 py-3 font-medium text-stone-600">Name</th>
                  <th className="px-4 py-3 font-medium text-stone-600">Plan</th>
                  <th className="px-4 py-3 font-medium text-stone-600">
                    Verified
                  </th>
                  <th className="px-4 py-3 font-medium text-stone-600">
                    Admin
                  </th>
                  <th className="px-4 py-3 font-medium text-stone-600">
                    Last Login
                  </th>
                  <th className="px-4 py-3 font-medium text-stone-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr
                    key={u.id}
                    className={`border-b border-stone-100 ${
                      i % 2 === 0 ? "bg-white" : "bg-stone-50"
                    }`}
                  >
                    <td className="px-4 py-3 font-medium text-stone-900">
                      {u.email}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {u.display_name || "-"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <select
                          value={u.plan}
                          onChange={(e) => handleChangePlan(u.id, e.target.value)}
                          className="rounded-lg border border-stone-200 bg-white px-2 py-1 text-xs font-medium text-stone-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="free">Free</option>
                          <option value="single">Single Exam</option>
                          <option value="pro_monthly">Pro Monthly</option>
                          <option value="pro_annual">Pro Annual</option>
                        </select>
                        {u.plan !== "free" && u.plan_expires_at && (
                          <span className="text-[10px] text-stone-400">
                            exp: {new Date(u.plan_expires_at).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {u.is_email_verified ? (
                        <CheckCircle className="h-4 w-4 text-green-500" />
                      ) : (
                        <XCircle className="h-4 w-4 text-stone-300" />
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {u.is_admin ? (
                        <span className="inline-block rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                          Admin
                        </span>
                      ) : (
                        <span className="text-stone-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-stone-500">
                      {u.last_login_at
                        ? new Date(u.last_login_at).toLocaleDateString()
                        : "Never"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleToggleAdmin(u.id)}
                          className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-600"
                        >
                          {u.is_admin ? "Remove Admin" : "Make Admin"}
                        </button>
                        {!u.is_admin && (
                          <button
                            onClick={() => handleDeleteUser(u.id, u.email)}
                            className="rounded-lg bg-red-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-red-600"
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-stone-200 px-4 py-3">
              <span className="text-sm text-stone-500">
                Showing {usersPage * USERS_PER_PAGE + 1}
                {" - "}
                {Math.min((usersPage + 1) * USERS_PER_PAGE, usersTotal)} of{" "}
                {usersTotal}
              </span>
              <div className="flex gap-2">
                <button
                  disabled={usersPage === 0}
                  onClick={() => loadUsersPage(usersPage - 1)}
                  className="rounded-lg border border-stone-200 p-1 text-stone-500 transition-colors hover:bg-stone-50 disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  disabled={usersPage >= totalPages - 1}
                  onClick={() => loadUsersPage(usersPage + 1)}
                  className="rounded-lg border border-stone-200 p-1 text-stone-500 transition-colors hover:bg-stone-50 disabled:opacity-40"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Exams Table */}
      {activeTab === "exams" && (
        <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-stone-200 bg-stone-50 text-left">
                  <th className="px-4 py-3 font-medium text-stone-600">Code</th>
                  <th className="px-4 py-3 font-medium text-stone-600">Name</th>
                  <th className="px-4 py-3 font-medium text-stone-600">
                    Concepts
                  </th>
                  <th className="px-4 py-3 font-medium text-stone-600">
                    Questions
                  </th>
                  <th className="px-4 py-3 font-medium text-stone-600">
                    Enrolled Users
                  </th>
                  <th className="px-4 py-3 font-medium text-stone-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {exams.map((exam, i) => (
                  <tr
                    key={exam.id}
                    className={`border-b border-stone-100 ${
                      i % 2 === 0 ? "bg-white" : "bg-stone-50"
                    }`}
                  >
                    <td className="px-4 py-3 font-mono text-sm font-medium text-stone-900">
                      {exam.code || exam.id}
                    </td>
                    <td className="px-4 py-3 text-stone-700">{exam.name}</td>
                    <td className="px-4 py-3 text-stone-600">
                      {exam.concepts_count}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {exam.questions_count}
                    </td>
                    <td className="px-4 py-3 text-stone-600">
                      {exam.enrolled_users_count}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleSelectExam(exam.id)}
                        className="rounded-lg bg-amber-500 px-3 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-600"
                      >
                        View Questions
                      </button>
                    </td>
                  </tr>
                ))}
                {exams.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-8 text-center text-stone-400"
                    >
                      No exams found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Questions Table */}
      {activeTab === "questions" && (
        <div className="space-y-4">
          {/* Exam selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium text-stone-600">Exam:</label>
            <select
              value={selectedExamId || ""}
              onChange={(e) => {
                if (e.target.value) handleSelectExam(e.target.value);
              }}
              className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="">Select an exam</option>
              {exams.map((exam) => (
                <option key={exam.id} value={exam.id}>
                  {exam.code || exam.id} - {exam.name}
                </option>
              ))}
            </select>
          </div>

          {selectedExamId && questions.length > 0 && (
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-stone-200 bg-stone-50 text-left">
                      <th className="px-4 py-3 font-medium text-stone-600">
                        ID
                      </th>
                      <th className="px-4 py-3 font-medium text-stone-600">
                        Stem
                      </th>
                      <th className="px-4 py-3 font-medium text-stone-600">
                        Type
                      </th>
                      <th className="px-4 py-3 font-medium text-stone-600">
                        Difficulty
                      </th>
                      <th className="px-4 py-3 font-medium text-stone-600">
                        Status
                      </th>
                      <th className="px-4 py-3 font-medium text-stone-600">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {questions.map((q, i) => (
                      <tr
                        key={q.id}
                        className={`border-b border-stone-100 ${
                          i % 2 === 0 ? "bg-white" : "bg-stone-50"
                        }`}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-stone-500">
                          {q.id}
                        </td>
                        <td
                          className="max-w-xs truncate px-4 py-3 text-stone-700"
                          title={q.stem}
                        >
                          {q.stem}
                        </td>
                        <td className="px-4 py-3">
                          <span className="inline-block rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium capitalize text-blue-700">
                            {q.type}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-stone-600">
                          {q.difficulty ?? "-"}
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={q.review_status} />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {q.review_status !== "approved" && (
                              <button
                                onClick={() =>
                                  handleUpdateStatus(q.id, "approved")
                                }
                                className="rounded bg-green-500 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-green-600"
                              >
                                Approve
                              </button>
                            )}
                            {q.review_status !== "retired" && (
                              <button
                                onClick={() =>
                                  handleUpdateStatus(q.id, "retired")
                                }
                                className="rounded bg-stone-400 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-stone-500"
                              >
                                Retire
                              </button>
                            )}
                            {q.review_status !== "draft" && (
                              <button
                                onClick={() =>
                                  handleUpdateStatus(q.id, "draft")
                                }
                                className="rounded bg-amber-500 px-2 py-1 text-xs font-medium text-white transition-colors hover:bg-amber-600"
                              >
                                Draft
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedExamId && questions.length === 0 && (
            <div className="rounded-xl border border-stone-200 bg-white px-4 py-8 text-center text-stone-400">
              No questions found for this exam
            </div>
          )}

          {!selectedExamId && (
            <div className="rounded-xl border border-stone-200 bg-white px-4 py-8 text-center text-stone-400">
              Select an exam to view its questions
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border border-stone-200 bg-white p-4">
      <div className="flex items-center gap-3">
        {icon}
        <div>
          <p className="text-2xl font-bold text-stone-900">
            {value.toLocaleString()}
          </p>
          <p className="text-sm text-stone-500">{label}</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    approved: "bg-green-100 text-green-700",
    draft: "bg-amber-100 text-amber-700",
    review: "bg-blue-100 text-blue-700",
    retired: "bg-stone-100 text-stone-500",
  };

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium capitalize ${
        styles[status] || "bg-stone-100 text-stone-500"
      }`}
    >
      {status}
    </span>
  );
}
