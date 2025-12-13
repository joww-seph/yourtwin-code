import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { submissionAPI } from '../services/api';
import { 
  ArrowLeft, 
  TrendingUp, 
  CheckCircle, 
  XCircle,
  Clock,
  Target
} from 'lucide-react';

function MyProgress() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProgress();
  }, []);

  const fetchProgress = async () => {
    try {
      const response = await submissionAPI.getAll();
      setProgress(response.data.data);
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

  // Calculate overall stats
  const totalActivities = progress.length;
  const completedActivities = progress.filter(p => p.status === 'completed').length;
  const averageScore = progress.length > 0
    ? Math.round(progress.reduce((sum, p) => sum + p.bestScore, 0) / progress.length)
    : 0;

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
              <p className="text-sm text-[#bac2de] mt-1">{user?.name}</p>
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
                <Target className="w-6 h-6 text-[#89b4fa]" />
              </div>
              <div>
                <p className="text-sm text-[#bac2de]">Activities</p>
                <p className="text-2xl font-bold text-[#cdd6f4]">{completedActivities}/{totalActivities}</p>
              </div>
            </div>
            <div className="w-full bg-[#45475a] rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-[#89b4fa] to-[#a6e3a1] h-2 rounded-full transition-all duration-500"
                style={{ width: `${totalActivities > 0 ? (completedActivities / totalActivities) * 100 : 0}%` }}
              ></div>
            </div>
          </div>

          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-[#a6e3a1] bg-opacity-20 rounded-lg">
                <TrendingUp className="w-6 h-6 text-[#a6e3a1]" />
              </div>
              <div>
                <p className="text-sm text-[#bac2de]">Average Score</p>
                <p className="text-2xl font-bold text-[#cdd6f4]">{averageScore}%</p>
              </div>
            </div>
          </div>

          <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-3 bg-[#f9e2af] bg-opacity-20 rounded-lg">
                <Clock className="w-6 h-6 text-[#f9e2af]" />
              </div>
              <div>
                <p className="text-sm text-[#bac2de]">Total Attempts</p>
                <p className="text-2xl font-bold text-[#cdd6f4]">
                  {progress.reduce((sum, p) => sum + p.totalAttempts, 0)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Activity Progress List */}
        <div className="bg-[#313244] border border-[#45475a] rounded-lg p-6">
          <h2 className="text-xl font-bold text-[#cdd6f4] mb-6">Activity Details</h2>
          
          {progress.length === 0 ? (
            <p className="text-center text-[#6c7086] py-8">
              No activities attempted yet. Start coding to see your progress!
            </p>
          ) : (
            <div className="space-y-3">
              {progress.map((item) => (
                <div
                  key={item.activity._id}
                  className="border border-[#45475a] rounded-lg p-4 hover:border-[#585b70] transition cursor-pointer"
                  onClick={() => navigate(`/student/activity/${item.activity._id}`)}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-medium text-[#cdd6f4] mb-1">
                        {item.activity.title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-[#bac2de]">
                        <span>{item.activity.topic}</span>
                        <span>•</span>
                        <span>{item.activity.difficulty}</span>
                        <span>•</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          item.activity.type === 'practice'
                            ? 'bg-[#a6e3a1] bg-opacity-20 text-[#a6e3a1]'
                            : 'bg-[#f38ba8] bg-opacity-20 text-[#f38ba8]'
                        }`}>
                          {item.activity.type}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {item.status === 'completed' ? (
                        <CheckCircle className="w-5 h-5 text-[#a6e3a1]" />
                      ) : (
                        <XCircle className="w-5 h-5 text-[#f38ba8]" />
                      )}
                      <span className="text-2xl font-bold text-[#cdd6f4]">
                        {item.bestScore}%
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-[#6c7086] mb-1">Attempts</p>
                      <p className="text-[#cdd6f4] font-medium">{item.totalAttempts}</p>
                    </div>
                    <div>
                      <p className="text-[#6c7086] mb-1">Status</p>
                      <p className={`font-medium ${
                        item.status === 'completed' ? 'text-[#a6e3a1]' :
                        item.status === 'in_progress' ? 'text-[#f9e2af]' :
                        'text-[#6c7086]'
                      }`}>
                        {item.status === 'completed' ? 'Completed' :
                         item.status === 'in_progress' ? 'In Progress' :
                         'Not Started'}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

export default MyProgress;