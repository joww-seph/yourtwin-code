import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { labSessionAPI, submissionAPI } from '../services/api';
import {
  ArrowLeft,
  TrendingUp,
  CheckCircle,
  XCircle,
  Clock,
  Target,
  Calendar,
  Code
} from 'lucide-react';

function MyProgress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      // Fetch all lab sessions student is enrolled in
      const [sessionsRes, submissionsRes] = await Promise.all([
        labSessionAPI.getAll(),
        submissionAPI.getAll()
      ]);
      // Backend already filters for active sessions and allowedStudents for students
      setSessions(sessionsRes.data.data);
      setSubmissions(submissionsRes.data.data || []);
    } catch (error) {
      console.error('Failed to fetch progress:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1e1e2e] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#89b4fa]"></div>
      </div>
    );
  }

  // Helper to get completed activities for a session
  const getCompletedActivitiesForSession = (session) => {
    if (!session || !session.activities) return 0;
    const sessionActivityIds = (session.activities || [])
      .filter(a => a != null)
      .map(a => a._id || a);
    return sessionActivityIds.filter(activityId => {
      return (submissions || []).some(sub => {
        if (!sub || !sub.activityId) return false;
        // Use activityId (BCNF field name) - backend returns activityId, not activity
        const subActivityId = typeof sub.activityId === 'object' ? sub.activityId?._id : sub.activityId;
        return subActivityId === activityId && sub.status === 'passed';
      });
    }).length;
  };

  // Calculate overall stats
  const totalSessions = sessions.length;
  const completedSessions = sessions.filter(session => {
    const sessionActivitiesCount = (session?.activities?.length || 0);
    if (sessionActivitiesCount === 0) return false;
    const completedCount = getCompletedActivitiesForSession(session);
    return completedCount === sessionActivitiesCount;
  }).length;
  const totalActivities = sessions.reduce((sum, s) => sum + (s?.activities?.length || 0), 0);
  const completedActivities = sessions.reduce((sum, s) => sum + getCompletedActivitiesForSession(s), 0);

  return (
    <div className="min-h-screen bg-[#1e1e2e]">
      {/* Header */}
      <header className="bg-[#313244] border-b border-[#45475a] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => navigate('/student/dashboard')}
              className="p-2 hover:bg-[#45475a] rounded-lg transition"
            >
              <ArrowLeft className="w-5 h-5 text-[#bac2de]" />
            </button>
            <div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] bg-clip-text text-transparent">
                My Progress
              </h1>
              <p className="text-sm text-[#bac2de] mt-1">
                {user?.displayName || `${user?.firstName} ${user?.lastName}`}
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Overall Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-[#89b4fa] bg-opacity-20 rounded-lg">
                <Calendar className="w-6 h-6 text-[#89b4fa]" />
              </div>
              <div>
                <p className="text-sm text-[#bac2de]">Sessions</p>
                <p className="text-2xl font-bold text-[#cdd6f4]">{completedSessions}/{totalSessions}</p>
              </div>
            </div>
            <div className="w-full bg-[#45475a] rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] h-2 rounded-full transition-all duration-500"
                style={{ width: `${totalSessions > 0 ? (completedSessions / totalSessions) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-[#a6e3a1] bg-opacity-20 rounded-lg">
                <Code className="w-6 h-6 text-[#a6e3a1]" />
              </div>
              <div>
                <p className="text-sm text-[#bac2de]">Activities</p>
                <p className="text-2xl font-bold text-[#cdd6f4]">{completedActivities}/{totalActivities}</p>
              </div>
            </div>
            <div className="w-full bg-[#45475a] rounded-full h-2">
              <div
                className="bg-gradient-to-r from-[#a6e3a1] to-[#89b4fa] h-2 rounded-full transition-all duration-500"
                style={{ width: `${totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-[#f9e2af] bg-opacity-20 rounded-lg">
                <Target className="w-6 h-6 text-[#f9e2af]" />
              </div>
              <div>
                <p className="text-sm text-[#bac2de]">Completion Rate</p>
                <p className="text-2xl font-bold text-[#cdd6f4]">
                  {totalActivities > 0 ? ((completedActivities / totalActivities) * 100).toFixed(0) : 0}%
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Lab Sessions Progress */}
        <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
          <h2 className="text-xl font-bold text-[#cdd6f4] mb-6">Lab Sessions</h2>
          
          {sessions.length === 0 ? (
            <p className="text-center text-[#6c7086] py-8">
              No lab sessions enrolled yet. Check back soon!
            </p>
          ) : (
            <div className="space-y-3">
              {sessions.map((session) => {
                const sessionActivities = session.activities || [];
                const completedActivitiesCount = getCompletedActivitiesForSession(session);

                return (
                  <div
                    key={session._id}
                    className="border border-[#45475a] rounded-lg p-4 hover:border-[#585b70] transition cursor-pointer"
                    onClick={() => navigate(`/student/session/${session._id}`)}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-medium text-[#cdd6f4] mb-1">
                          {session.title}
                        </h3>
                        <p className="text-sm text-[#bac2de] mb-3">
                          {session.description}
                        </p>
                        <div className="flex items-center gap-3 text-sm text-[#bac2de]">
                          <span className="px-2 py-0.5 rounded text-xs bg-[#89b4fa] bg-opacity-20 text-[#89b4fa]">
                            {sessionActivities.length} activities
                          </span>
                          <span>•</span>
                          <span>
                            {session.isActive ? '🔵 Active' : '⚫ Inactive'}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {completedActivitiesCount === sessionActivities.length && sessionActivities.length > 0 ? (
                          <CheckCircle className="w-5 h-5 text-[#a6e3a1]" />
                        ) : (
                          <Clock className="w-5 h-5 text-[#f9e2af]" />
                        )}
                        <span className="text-lg font-bold text-[#cdd6f4]">
                          {completedActivitiesCount}/{sessionActivities.length}
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-[#45475a] rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] h-2 rounded-full transition-all duration-500"
                        style={{ width: `${sessionActivities.length > 0 ? (completedActivitiesCount / sessionActivities.length) * 100 : 0}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default MyProgress;