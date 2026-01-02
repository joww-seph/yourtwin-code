import { useState, useEffect } from 'react';
import { Search, X, Users, Filter, ChevronDown, Lock } from 'lucide-react';
import { studentAPI } from '../services/api';

function StudentSelector({
  onStudentsSelected,
  maxHeight = '400px',
  excludeStudentIds = [],
  sessionInfo = null // { course, yearLevel, section } - to auto-filter and show target audience
}) {
  const [students, setStudents] = useState([]);
  const [filteredStudents, setFilteredStudents] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [showFilters, setShowFilters] = useState(false);

  // Check if session has target audience restrictions
  const hasTargetAudience = sessionInfo && (sessionInfo.course || sessionInfo.yearLevel || sessionInfo.section);

  // Filter states - initialize with session target if available
  const [filters, setFilters] = useState({
    course: sessionInfo?.course || '',
    yearLevel: sessionInfo?.yearLevel?.toString() || '',
    section: sessionInfo?.section || ''
  });
  const [courses, setCourses] = useState([]);
  const [yearLevels, setYearLevels] = useState([]);
  const [sections, setSections] = useState([]);

  // Update filters when sessionInfo changes
  useEffect(() => {
    if (sessionInfo) {
      setFilters({
        course: sessionInfo.course || '',
        yearLevel: sessionInfo.yearLevel?.toString() || '',
        section: sessionInfo.section || ''
      });
    }
  }, [sessionInfo]);

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [students, searchQuery, filters, excludeStudentIds]);

  const fetchStudents = async () => {
    try {
      const response = await studentAPI.search({});
      const allStudents = response.data.data || [];
      setStudents(allStudents);
      
      // Extract unique values for filters
      const uniqueCourses = [...new Set(allStudents.map(s => s.course).filter(Boolean))];
      const uniqueYears = [...new Set(allStudents.map(s => s.yearLevel).filter(Boolean))];
      const uniqueSections = [...new Set(allStudents.map(s => s.section).filter(Boolean))];
      
      setCourses(uniqueCourses.sort());
      setYearLevels(uniqueYears.sort());
      setSections(uniqueSections.sort());
    } catch (error) {
      console.error('Failed to fetch students:', error);
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = students.filter(student => {
      // Exclude already enrolled students
      if (excludeStudentIds.includes(student._id)) return false;

      // Search filter
      const query = searchQuery.toLowerCase();
      const fullName = `${student.firstName} ${student.lastName}`.toLowerCase();
      const matchesSearch = fullName.includes(query) || 
                           (student.studentId && student.studentId.toLowerCase().includes(query));

      if (!matchesSearch) return false;

      // Course filter
      if (filters.course && student.course !== filters.course) return false;

      // Year level filter - convert to number for comparison
      if (filters.yearLevel && student.yearLevel !== parseInt(filters.yearLevel)) return false;

      // Section filter
      if (filters.section && student.section !== filters.section) return false;

      return true;
    });

    setFilteredStudents(filtered);
  };

  const toggleStudent = (studentId) => {
    setSelectedStudents(prev => {
      if (prev.includes(studentId)) {
        return prev.filter(id => id !== studentId);
      } else {
        return [...prev, studentId];
      }
    });
  };

  const selectAllFiltered = () => {
    const allFilteredIds = filteredStudents.map(s => s._id);
    setSelectedStudents(prev => {
      const combined = new Set([...prev, ...allFilteredIds]);
      return Array.from(combined);
    });
  };

  const deselectAllFiltered = () => {
    const allFilteredIds = new Set(filteredStudents.map(s => s._id));
    setSelectedStudents(prev => prev.filter(id => !allFilteredIds.has(id)));
  };

  const clearSelection = () => {
    setSelectedStudents([]);
  };

  const getSelectedStudentDetails = () => {
    return students.filter(s => selectedStudents.includes(s._id));
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  const clearFilters = () => {
    setFilters({
      course: '',
      yearLevel: '',
      section: ''
    });
    setSearchQuery('');
  };

  const isAllSelected = filteredStudents.length > 0 && 
                        filteredStudents.every(s => selectedStudents.includes(s._id));
  const isSomeSelected = filteredStudents.some(s => selectedStudents.includes(s._id));

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#89b4fa]"></div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* Left Panel - Student List */}
      <div className="flex-1">
        {/* Session Target Audience Info - Auto-filtering applied */}
        {hasTargetAudience && (
          <div className="mb-4 p-3 bg-[#89b4fa] bg-opacity-20 border border-[#89b4fa] border-opacity-30 rounded-lg flex items-start gap-3">
            <Filter className="w-5 h-5 text-[#89b4fa] flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-[#89b4fa]">Auto-filtered by Session Target</p>
              <p className="text-[#bac2de]">
                Showing only <span className="font-medium text-[#cdd6f4]">{sessionInfo.course} {sessionInfo.yearLevel}-{sessionInfo.section}</span> students.
                {filteredStudents.length === 0 && students.length > 0 && (
                  <span className="text-[#f9e2af]"> No matching students found.</span>
                )}
              </p>
            </div>
          </div>
        )}

        {/* Search Bar */}
        <div className="mb-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-[#6c7086]" />
            <input
              type="text"
              placeholder="Search by name or student ID"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#45475a] border border-[#585b70] rounded px-3 py-2 pl-10 text-[#cdd6f4] placeholder-[#6c7086] focus:outline-none focus:border-[#89b4fa]"
            />
          </div>
        </div>

        {/* Filter Toggle and Controls */}
        <div className="mb-4 flex items-center justify-between">
          <button
            onClick={() => !hasTargetAudience && setShowFilters(!showFilters)}
            disabled={hasTargetAudience}
            className={`flex items-center gap-2 px-3 py-2 rounded text-sm transition ${
              hasTargetAudience
                ? 'bg-[#45475a] text-[#6c7086] cursor-not-allowed'
                : 'bg-[#45475a] hover:bg-[#585b70] text-[#cdd6f4]'
            }`}
          >
            {hasTargetAudience ? <Lock className="w-4 h-4" /> : <Filter className="w-4 h-4" />}
            {hasTargetAudience ? 'Filters Locked' : 'Filters'}
            {!hasTargetAudience && <ChevronDown className={`w-4 h-4 transition ${showFilters ? 'rotate-180' : ''}`} />}
          </button>

          {!hasTargetAudience && Object.values(filters).some(v => v) && (
            <button
              onClick={clearFilters}
              className="text-xs text-[#f38ba8] hover:text-[#f28482] transition"
            >
              Clear filters
            </button>
          )}
        </div>

        {/* Filters Panel - Hidden when target audience is set */}
        {showFilters && !hasTargetAudience && (
          <div className="bg-[#45475a] rounded p-4 mb-4 space-y-3">
            <div>
              <label className="text-xs text-[#bac2de] block mb-1">Course</label>
              <select
                value={filters.course}
                onChange={(e) => handleFilterChange('course', e.target.value)}
                className="w-full bg-[#1e1e2e] border border-[#585b70] rounded px-2 py-1 text-[#cdd6f4] text-sm focus:outline-none focus:border-[#89b4fa]"
              >
                <option value="">All Courses</option>
                {courses.map(course => (
                  <option key={course} value={course}>{course}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-[#bac2de] block mb-1">Year Level</label>
              <select
                value={filters.yearLevel}
                onChange={(e) => handleFilterChange('yearLevel', e.target.value)}
                className="w-full bg-[#1e1e2e] border border-[#585b70] rounded px-2 py-1 text-[#cdd6f4] text-sm focus:outline-none focus:border-[#89b4fa]"
              >
                <option value="">All Years</option>
                {yearLevels.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-[#bac2de] block mb-1">Section</label>
              <select
                value={filters.section}
                onChange={(e) => handleFilterChange('section', e.target.value)}
                className="w-full bg-[#1e1e2e] border border-[#585b70] rounded px-2 py-1 text-[#cdd6f4] text-sm focus:outline-none focus:border-[#89b4fa]"
              >
                <option value="">All Sections</option>
                {sections.map(section => (
                  <option key={section} value={section}>{section}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Select All / Deselect All */}
        {filteredStudents.length > 0 && (
          <div className="mb-4 flex gap-2">
            <button
              onClick={selectAllFiltered}
              className={`flex-1 px-3 py-2 text-sm rounded transition ${
                isAllSelected
                  ? 'bg-[#585b70] text-[#bac2de]'
                  : 'bg-[#89b4fa] hover:bg-[#7ba3e8] text-[#1e1e2e] font-medium'
              }`}
            >
              Select All
            </button>
            <button
              onClick={deselectAllFiltered}
              className="flex-1 px-3 py-2 text-sm rounded bg-[#45475a] hover:bg-[#585b70] text-[#cdd6f4] transition"
            >
              Deselect All
            </button>
          </div>
        )}

        {/* Student List */}
        <div 
          className="bg-[#1e1e2e] border border-[#45475a] rounded overflow-y-auto"
          style={{ maxHeight }}
        >
          {filteredStudents.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-8 h-8 text-[#6c7086] mx-auto mb-2" />
              <p className="text-[#6c7086] text-sm">No students found</p>
            </div>
          ) : (
            <div className="divide-y divide-[#45475a]">
              {[...filteredStudents]
                .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''))
                .map(student => {
                  const middleInitial = student.middleName ? ` ${student.middleName.charAt(0)}.` : '';
                  return (
                    <label
                      key={student._id}
                      className="flex items-center gap-3 p-3 hover:bg-[#313244] cursor-pointer transition border-l-2 border-transparent hover:border-[#89b4fa]"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStudents.includes(student._id)}
                        onChange={() => toggleStudent(student._id)}
                        className="w-4 h-4 cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[#cdd6f4] font-medium text-sm">
                            {student.lastName}, {student.firstName}{middleInitial}
                          </p>
                          {/* Course/Year/Section badge */}
                          {student.course && (
                            <span className="px-1.5 py-0.5 text-xs font-medium rounded bg-[#cba6f7] bg-opacity-20 text-[#cba6f7]">
                              {student.course} {student.yearLevel}-{student.section}
                            </span>
                          )}
                        </div>
                        <p className="text-[#6c7086] text-xs">
                          {student.studentId}
                        </p>
                      </div>
                    </label>
                  );
                })}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel - Selected Students */}
      <div className="w-64">
        <div className="bg-[#313244] border border-[#45475a] rounded-lg p-4 sticky top-0">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-[#cdd6f4]">
              Selected: {selectedStudents.length}
            </h3>
            {selectedStudents.length > 0 && (
              <button
                onClick={clearSelection}
                className="text-xs text-[#f38ba8] hover:text-[#f28482] transition"
              >
                Clear
              </button>
            )}
          </div>

          {/* Selected Students List */}
          <div 
            className="bg-[#1e1e2e] border border-[#45475a] rounded p-3 mb-4 overflow-y-auto"
            style={{ maxHeight: '250px' }}
          >
            {getSelectedStudentDetails().length === 0 ? (
              <p className="text-[#6c7086] text-sm text-center py-8">
                No students selected
              </p>
            ) : (
              <div className="space-y-2">
                {[...getSelectedStudentDetails()]
                  .sort((a, b) => (a.lastName || '').localeCompare(b.lastName || ''))
                  .map(student => {
                    const middleInitial = student.middleName ? ` ${student.middleName.charAt(0)}.` : '';
                    return (
                      <div
                        key={student._id}
                        className="flex items-center justify-between bg-[#313244] rounded p-2 text-sm"
                      >
                        <div className="flex-1 min-w-0 mr-2">
                          <span className="text-[#cdd6f4] truncate block">
                            {student.lastName}, {student.firstName}{middleInitial}
                          </span>
                          {student.course && (
                            <span className="text-[#6c7086] text-xs">
                              {student.course} {student.yearLevel}-{student.section}
                            </span>
                          )}
                        </div>
                        <button
                          onClick={() => toggleStudent(student._id)}
                          className="text-[#f38ba8] hover:text-[#f28482] transition flex-shrink-0"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>

          {/* Add Students Button */}
          <button
            onClick={() => onStudentsSelected(selectedStudents)}
            disabled={selectedStudents.length === 0}
            className="w-full px-4 py-2 bg-[#a6e3a1] hover:bg-[#94d982] disabled:opacity-50 disabled:cursor-not-allowed text-[#1e1e2e] font-medium rounded transition"
          >
            Add {selectedStudents.length} Student{selectedStudents.length !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}

export default StudentSelector;
