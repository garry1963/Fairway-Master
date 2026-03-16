import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Map, Plus, Trash2, ChevronDown, ChevronUp, Globe } from 'lucide-react';
import { db, type Course, type HoleDefinition } from '../db';

export function Courses() {
  const [isAdding, setIsAdding] = useState(false);
  const [expandedCourseId, setExpandedCourseId] = useState<number | null>(null);
  const [newCourseName, setNewCourseName] = useState('');
  const [newCourseLocation, setNewCourseLocation] = useState('');
  
  const courses = useLiveQuery(() => db.courses.toArray());

  const handleAddCourse = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const holes: HoleDefinition[] = [];
    let totalPar = 0;
    let totalYardage = 0;

    for (let i = 1; i <= 18; i++) {
      const par = parseInt(formData.get(`hole_${i}_par`) as string, 10);
      const yardage = parseInt(formData.get(`hole_${i}_yardage`) as string, 10);
      const strokeIndex = parseInt(formData.get(`hole_${i}_si`) as string, 10);
      
      holes.push({ holeNumber: i, par, yardage, strokeIndex });
      totalPar += par;
      totalYardage += yardage;
    }

    await db.courses.add({
      name: formData.get('name') as string,
      location: formData.get('location') as string,
      par: totalPar,
      yardage: totalYardage,
      slopeRating: parseFloat(formData.get('slopeRating') as string),
      courseRating: parseFloat(formData.get('courseRating') as string),
      holes
    });
    
    setIsAdding(false);
    setNewCourseName('');
    setNewCourseLocation('');
  };

  const handleDelete = async (id: number) => {
    if (confirm('Are you sure you want to delete this course?')) {
      await db.courses.delete(id);
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedCourseId(expandedCourseId === id ? null : id);
  };

  const handleWebSearch = (e: React.MouseEvent, name: string, location: string) => {
    e.stopPropagation();
    const query = encodeURIComponent(`${name} golf course ${location}`.trim());
    window.open(`https://www.google.com/search?q=${query}`, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-slate-900">Courses</h1>
        <button 
          onClick={() => setIsAdding(true)}
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Map className="w-4 h-4" />
          Add Course
        </button>
      </div>

      {isAdding && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">Add New Course</h2>
            <button 
              type="button"
              onClick={(e) => handleWebSearch(e, newCourseName, newCourseLocation)}
              disabled={!newCourseName}
              className="text-sm bg-slate-100 hover:bg-slate-200 text-slate-700 px-3 py-1.5 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-50"
            >
              <Globe className="w-4 h-4" />
              Search Web for Info
            </button>
          </div>
          <form onSubmit={handleAddCourse} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Course Name *</label>
                <input 
                  required 
                  name="name" 
                  type="text" 
                  value={newCourseName}
                  onChange={(e) => setNewCourseName(e.target.value)}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Location</label>
                <input 
                  name="location" 
                  type="text" 
                  value={newCourseLocation}
                  onChange={(e) => setNewCourseLocation(e.target.value)}
                  className="w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Course Rating *</label>
                <input required name="courseRating" type="number" step="0.1" className="w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">Slope Rating *</label>
                <input required name="slopeRating" type="number" className="w-full rounded-md border-slate-300 shadow-sm focus:border-emerald-500 focus:ring-emerald-500 p-2 border" />
              </div>
            </div>

            <div>
              <h3 className="text-md font-medium text-slate-800 mb-3 border-b pb-2">Hole Details</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-center">
                  <thead>
                    <tr className="bg-slate-50">
                      <th className="p-2 border">Hole</th>
                      {Array.from({ length: 18 }, (_, i) => (
                        <th key={i} className="p-2 border w-12">{i + 1}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="p-2 border font-medium bg-slate-50">Par</td>
                      {Array.from({ length: 18 }, (_, i) => (
                        <td key={i} className="p-1 border">
                          <input required name={`hole_${i+1}_par`} type="number" min="3" max="6" defaultValue="4" className="w-full text-center border-none p-1 focus:ring-0" />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2 border font-medium bg-slate-50">Yardage</td>
                      {Array.from({ length: 18 }, (_, i) => (
                        <td key={i} className="p-1 border">
                          <input required name={`hole_${i+1}_yardage`} type="number" min="50" max="700" defaultValue="350" className="w-full text-center border-none p-1 focus:ring-0 text-xs" />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="p-2 border font-medium bg-slate-50">S.I.</td>
                      {Array.from({ length: 18 }, (_, i) => (
                        <td key={i} className="p-1 border">
                          <input required name={`hole_${i+1}_si`} type="number" min="1" max="18" defaultValue={i+1} className="w-full text-center border-none p-1 focus:ring-0" />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button type="button" onClick={() => setIsAdding(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
              <button type="submit" className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700">Save Course</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid grid-cols-1 gap-4">
        {courses?.length === 0 ? (
          <div className="bg-white p-8 text-center text-slate-500 rounded-xl shadow-sm border border-slate-200">
            No courses found. Add a course to get started.
          </div>
        ) : (
          courses?.map((course) => (
            <div key={course.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
              <div 
                className="p-4 flex justify-between items-center cursor-pointer hover:bg-slate-50 transition-colors"
                onClick={() => toggleExpand(course.id!)}
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-100 text-emerald-700 rounded-lg">
                    <Map className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">{course.name}</h3>
                    <p className="text-sm text-slate-500">{course.location} • Par {course.par} • {course.yardage} yds</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right hidden md:block">
                    <p className="text-sm font-medium text-slate-900">CR: {course.courseRating} / SR: {course.slopeRating}</p>
                  </div>
                  <button 
                    onClick={(e) => handleWebSearch(e, course.name, course.location)} 
                    className="text-slate-400 hover:text-blue-600 p-2 rounded hover:bg-blue-50"
                    title="Search Web for Course"
                  >
                    <Globe className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(course.id!); }} 
                    className="text-red-600 hover:text-red-900 p-2 rounded hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {expandedCourseId === course.id ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </div>
              </div>
              
              {expandedCourseId === course.id && (
                <div className="p-4 border-t border-slate-200 bg-slate-50/50 overflow-x-auto">
                  <table className="w-full text-sm text-center border-collapse">
                    <thead>
                      <tr className="bg-slate-100">
                        <th className="p-2 border border-slate-300">Hole</th>
                        {course.holes.map(h => <th key={h.holeNumber} className="p-2 border border-slate-300 w-10">{h.holeNumber}</th>)}
                        <th className="p-2 border border-slate-300 font-bold">OUT</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td className="p-2 border border-slate-300 font-medium bg-slate-100">Par</td>
                        {course.holes.map(h => <td key={h.holeNumber} className="p-2 border border-slate-300">{h.par}</td>)}
                        <td className="p-2 border border-slate-300 font-bold bg-slate-100">{course.par}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-slate-300 font-medium bg-slate-100">Yardage</td>
                        {course.holes.map(h => <td key={h.holeNumber} className="p-2 border border-slate-300 text-xs">{h.yardage}</td>)}
                        <td className="p-2 border border-slate-300 font-bold bg-slate-100">{course.yardage}</td>
                      </tr>
                      <tr>
                        <td className="p-2 border border-slate-300 font-medium bg-slate-100">S.I.</td>
                        {course.holes.map(h => <td key={h.holeNumber} className="p-2 border border-slate-300 text-xs">{h.strokeIndex}</td>)}
                        <td className="p-2 border border-slate-300 bg-slate-100"></td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
