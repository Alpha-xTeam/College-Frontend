import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/lib/supabase';
import api from '@/lib/api';
import type { Classroom, Material, Course, ClassroomPost, User, PostComment } from '@/types';
import {
  BookOpen, Plus, Copy, Check, X, FileText, Link2, Video, ClipboardList,
  ArrowLeft, Users, Upload, Code, Loader2, Megaphone,
  UserPlus, Shield, Trash2, Globe, MessageSquare, Send, Download
} from 'lucide-react';
import { cn } from '@/utils/cn';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

const gradients = [
  'from-blue-600 to-indigo-700',
  'from-emerald-600 to-teal-700',
  'from-purple-600 to-pink-700',
  'from-amber-600 to-orange-700',
  'from-rose-600 to-red-700',
];

const materialIcons = {
  pdf: FileText,
  link: Link2,
  video: Video,
  assignment: ClipboardList,
};

const materialColors = {
  pdf: 'bg-red-100 text-red-600',
  link: 'bg-blue-100 text-blue-600',
  video: 'bg-purple-100 text-purple-600',
  assignment: 'bg-amber-100 text-amber-600',
};

const CommentSection = React.memo(({ postId, currentUser }: { postId: string; currentUser: User | null }) => {
  const queryClient = useQueryClient();
  const [newComment, setNewComment] = useState('');

  const { data: comments = [], isLoading: loading } = useQuery<PostComment[]>({
    queryKey: ['classrooms', 'posts', postId, 'comments'],
    queryFn: async () => (await api.get(`/classrooms/posts/${postId}/comments`)).data
  });

  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      return await api.post(`/classrooms/posts/${postId}/comments`, {
        post_id: postId,
        author_id: currentUser?.id,
        content
      });
    },
    onMutate: async (content) => {
      const queryKey = ['classrooms', 'posts', postId, 'comments'];
      await queryClient.cancelQueries({ queryKey });
      const previousComments = queryClient.getQueryData<PostComment[]>(queryKey);

      const optimisticComment = {
        id: 'temp-' + Date.now(),
        post_id: postId,
        author_id: currentUser?.id,
        content,
        created_at: new Date().toISOString(),
        profiles: {
          full_name: currentUser?.full_name,
          full_name_ar: currentUser?.full_name_ar
        }
      };

      queryClient.setQueryData<PostComment[]>(queryKey, (old) => 
        old ? [...old, optimisticComment as any] : [optimisticComment as any]
      );

      setNewComment('');
      return { previousComments };
    },
    onError: (_err, _content, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['classrooms', 'posts', postId, 'comments'], context.previousComments);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms', 'posts', postId, 'comments'] });
    }
  });

  const deleteCommentMutation = useMutation({
    mutationFn: async (commentId: string) => {
      return await api.delete(`/classrooms/posts/comments/${commentId}`);
    },
    onMutate: async (commentId) => {
      const queryKey = ['classrooms', 'posts', postId, 'comments'];
      await queryClient.cancelQueries({ queryKey });
      const previousComments = queryClient.getQueryData<PostComment[]>(queryKey);

      queryClient.setQueryData<PostComment[]>(queryKey, (old) => 
        old ? old.filter(c => c.id !== commentId) : []
      );

      return { previousComments };
    },
    onError: (_err, _commentId, context) => {
      if (context?.previousComments) {
        queryClient.setQueryData(['classrooms', 'posts', postId, 'comments'], context.previousComments);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms', 'posts', postId, 'comments'] });
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !currentUser) return;
    addCommentMutation.mutate(newComment.trim());
  };

  const handleDeleteComment = useCallback((commentId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذا التعليق؟')) return;
    deleteCommentMutation.mutate(commentId);
  }, [deleteCommentMutation]);

  return (
    <div className="mt-6 pt-6 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-4 text-sm font-bold text-gray-700">
        <MessageSquare className="w-4 h-4 text-indigo-600" />
        التعليقات ({comments.length})
      </div>
      
      <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-2">
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-gray-400 text-center italic py-2">لا توجد تعليقات بعد.</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="flex gap-3 group">
              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-bold shrink-0 text-indigo-600">
                {comment.profiles?.full_name?.charAt(0)}
              </div>
              <div className="flex-1 bg-gray-50 rounded-2xl px-3 py-2">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-gray-900">{comment.profiles?.full_name_ar || comment.profiles?.full_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">{new Date(comment.created_at).toLocaleDateString('ar-IQ')}</span>
                    {(comment.author_id === currentUser?.id || currentUser?.role === 'hod' || currentUser?.role === 'dean' || currentUser?.role === 'owner') && (
                      <button onClick={() => handleDeleteComment(comment.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="اكتب تعليقاً..."
          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm pl-10 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
          dir="rtl"
        />
        <button 
          type="submit"
          disabled={!newComment.trim() || addCommentMutation.isPending}
          className="absolute left-2 top-2 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30"
          title="إرسال"
        >
          {addCommentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
});

CommentSection.displayName = 'CommentSection';

  return (
    <div className="mt-6 pt-6 border-t border-gray-100">
      <div className="flex items-center gap-2 mb-4 text-sm font-bold text-gray-700">
        <MessageSquare className="w-4 h-4 text-indigo-600" />
        التعليقات ({comments.length})
      </div>
      
      <div className="space-y-4 mb-4 max-h-[300px] overflow-y-auto custom-scrollbar">
        {loading ? (
          <div className="flex justify-center py-2">
            <Loader2 className="w-4 h-4 text-gray-400 animate-spin" />
          </div>
        ) : comments.length === 0 ? (
          <p className="text-xs text-gray-400 text-center italic py-2">لا توجد تعليقات بعد.</p>
        ) : (
          comments.map(comment => (
            <div key={comment.id} className="flex gap-3 group">
              <div className="w-8 h-8 rounded-full bg-indigo-50 border border-indigo-100 flex items-center justify-center text-[10px] font-bold shrink-0 text-indigo-600">
                {comment.profiles?.full_name?.charAt(0)}
              </div>
              <div className="flex-1 bg-gray-50 rounded-2xl px-3 py-2">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold text-gray-900">{comment.profiles?.full_name_ar || comment.profiles?.full_name}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400">{new Date(comment.created_at).toLocaleDateString('ar-IQ')}</span>
                    {(comment.author_id === currentUser?.id || currentUser?.role === 'hod' || currentUser?.role === 'dean' || currentUser?.role === 'owner') && (
                      <button onClick={() => handleDeleteComment(comment.id)} className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 transition-all">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-700">{comment.content}</p>
              </div>
            </div>
          ))
        )}
      </div>

      <form onSubmit={handleSubmit} className="relative">
        <input
          type="text"
          value={newComment}
          onChange={e => setNewComment(e.target.value)}
          placeholder="اكتب تعليقاً..."
          className="w-full bg-gray-50 border border-gray-100 rounded-xl px-4 py-2.5 text-sm pl-10 focus:bg-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all outline-none"
          dir="rtl"
        />
        <button 
          type="submit"
          disabled={!newComment.trim() || addCommentMutation.isPending}
          className="absolute left-2 top-2 p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors disabled:opacity-30"
          title="إرسال"
        >
          {addCommentMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </button>
      </form>
    </div>
  );
}

export function ClassroomsPage() {
  const { currentUser } = useAuth();
  const queryClient = useQueryClient();
  const [selectedClassroom, setSelectedClassroom] = useState<Classroom | null>(null);
  const [activeTab, setActiveTab] = useState<'stream' | 'students'>('stream');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showPostModal, setShowPostModal] = useState(false);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  const [joinCode, setJoinCode] = useState('');
  const [joinError, setJoinError] = useState('');

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code).catch(() => {/* fallback */});
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
  };

  const isOwner = currentUser?.role === 'owner';
  const isTeacher = currentUser?.role === 'teacher';
  const isStudent = currentUser?.role === 'student';
  const isHod = currentUser?.role === 'hod';
  const isDean = currentUser?.role === 'dean' || isOwner;
  const canManageClassrooms = isHod || isDean;
  const canPost = isTeacher || isHod || isDean;

  // Queries
  const { data: classrooms = [], isLoading: loadingClassrooms } = useQuery<Classroom[]>({
    queryKey: ['classrooms', currentUser?.id],
    queryFn: async () => (await api.get('/classrooms/', {
      params: { user_id: currentUser?.id, role: currentUser?.role }
    })).data,
    enabled: !!currentUser?.id
  });

  const { data: assignedTeachers = [] } = useQuery<any[]>({
    queryKey: ['classrooms', selectedClassroom?.id, 'details'],
    queryFn: async () => (await api.get(`/classrooms/${selectedClassroom?.id}`)).data.assigned_teachers || [],
    enabled: !!selectedClassroom?.id
  });

  const { data: posts = [], isLoading: loadingPosts } = useQuery<ClassroomPost[]>({
    queryKey: ['classrooms', selectedClassroom?.id, 'posts'],
    queryFn: async () => (await api.get(`/classrooms/${selectedClassroom?.id}/posts`, {
      params: { user_id: currentUser?.id }
    })).data,
    enabled: !!selectedClassroom?.id
  });

  const { data: materials = [], isLoading: loadingMaterials } = useQuery<Material[]>({
    queryKey: ['classrooms', selectedClassroom?.id, 'materials'],
    queryFn: async () => (await api.get(`/classrooms/${selectedClassroom?.id}/materials`)).data,
    enabled: !!selectedClassroom?.id
  });

  const { data: students = [], isLoading: loadingStudents } = useQuery<User[]>({
    queryKey: ['classrooms', selectedClassroom?.id, 'students'],
    queryFn: async () => (await api.get(`/classrooms/${selectedClassroom?.id}/students`)).data,
    enabled: !!selectedClassroom?.id
  });

  // Mutations
  const joinMutation = useMutation({
    mutationFn: async (code: string) => {
      return await api.post('/classrooms/join', null, {
        params: { student_id: currentUser?.id, class_code: code }
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      setShowJoinModal(false);
      setJoinCode('');
    },
    onError: (err: any) => {
      setJoinError(err.response?.data?.detail || 'Failed to join classroom');
    }
  });

  const createClassroomMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post('/classrooms/', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
      setShowCreateModal(false);
    }
  });

  const assignTeacherMutation = useMutation({
    mutationFn: async (teacherId: string) => {
      return await api.post(`/classrooms/${selectedClassroom?.id}/teachers`, { teacher_id: teacherId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms', selectedClassroom?.id, 'details'] });
      setShowAssignModal(false);
    }
  });

  const createPostMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post(`/classrooms/${selectedClassroom?.id}/posts`, {
        ...payload,
        author_id: currentUser?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms', selectedClassroom?.id, 'posts'] });
      setShowPostModal(false);
    }
  });

  const deletePostMutation = useMutation({
    mutationFn: async (postId: string) => {
      return await api.delete(`/classrooms/${selectedClassroom?.id}/posts/${postId}`);
    },
    onMutate: async (postId) => {
      const queryKey = ['classrooms', selectedClassroom?.id, 'posts'];
      await queryClient.cancelQueries({ queryKey });
      const previousPosts = queryClient.getQueryData<ClassroomPost[]>(queryKey);

      queryClient.setQueryData<ClassroomPost[]>(queryKey, (old) => 
        old ? old.filter(post => post.id !== postId) : []
      );

      return { previousPosts };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(['classrooms', selectedClassroom?.id, 'posts'], context.previousPosts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms', selectedClassroom?.id, 'posts'] });
    }
  });

  const uploadMaterialMutation = useMutation({
    mutationFn: async (payload: any) => {
      return await api.post(`/classrooms/${selectedClassroom?.id}/materials`, {
        ...payload,
        classroom_id: selectedClassroom?.id,
        uploaded_by: currentUser?.id
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms', selectedClassroom?.id, 'materials'] });
      setShowUploadModal(false);
    }
  });

  const voteMutation = useMutation({
    mutationFn: async ({ postId, optionIndex }: { postId: string, optionIndex: number }) => {
      return await api.post(`/classrooms/posts/${postId}/poll/vote`, null, {
        params: { option_index: optionIndex }
      });
    },
    onMutate: async ({ postId, optionIndex }) => {
      const queryKey = ['classrooms', selectedClassroom?.id, 'posts'];
      await queryClient.cancelQueries({ queryKey });
      const previousPosts = queryClient.getQueryData<ClassroomPost[]>(queryKey);

      queryClient.setQueryData<ClassroomPost[]>(queryKey, (old) => {
        if (!old) return [];
        return old.map(post => {
          if (post.id === postId) {
            const poll_responses = post.poll_responses || [];
            const userVoteIndex = poll_responses.findIndex(r => r.user_id === currentUser?.id);
            
            let newResponses;
            if (userVoteIndex > -1) {
              newResponses = [...poll_responses];
              newResponses[userVoteIndex] = { ...newResponses[userVoteIndex], option_index: optionIndex };
            } else {
              newResponses = [...poll_responses, { user_id: currentUser?.id, option_index: optionIndex } as any];
            }
            return { ...post, poll_responses: newResponses };
          }
          return post;
        });
      });

      return { previousPosts };
    },
    onError: (_err, _variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(['classrooms', selectedClassroom?.id, 'posts'], context.previousPosts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms', selectedClassroom?.id, 'posts'] });
    }
  });

  const submitAssignmentMutation = useMutation({
    mutationFn: async ({ postId, fileUrl, fileName }: { postId: string, fileUrl: string, fileName: string }) => {
      return await api.post(`/classrooms/posts/${postId}/submissions`, {
        file_url: fileUrl,
        file_name: fileName
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms', selectedClassroom?.id, 'posts'] });
      alert('تم تسليم الواجب بنجاح.');
    }
  });

  const gradeSubmissionMutation = useMutation({
    mutationFn: async ({ submissionId, grade, feedback }: { submissionId: string, grade: number, feedback: string }) => {
      return await api.post(`/classrooms/submissions/${submissionId}/grade`, { grade, feedback });
    },
    onMutate: async ({ submissionId, grade }) => {
      const queryKey = ['classrooms', selectedClassroom?.id, 'posts'];
      await queryClient.cancelQueries({ queryKey });
      const previousPosts = queryClient.getQueryData<ClassroomPost[]>(queryKey);

      queryClient.setQueryData<ClassroomPost[]>(queryKey, (old) => {
        if (!old) return [];
        return old.map(post => {
          if (post.submissions) {
            const hasSubmission = post.submissions.some(s => s.id === submissionId);
            if (hasSubmission) {
              return {
                ...post,
                submissions: post.submissions.map(s => 
                  s.id === submissionId ? { ...s, grade } : s
                )
              };
            }
          }
          return post;
        });
      });

      return { previousPosts };
    },
    onSuccess: () => {
      alert('تم رصد الدرجة بنجاح.');
    },
    onError: (_err, _variables, context) => {
      if (context?.previousPosts) {
        queryClient.setQueryData(['classrooms', selectedClassroom?.id, 'posts'], context.previousPosts);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['classrooms', selectedClassroom?.id, 'posts'] });
    }
  });

  const updateBannerMutation = useMutation({
    mutationFn: async (bannerUrl: string) => {
      return await api.patch(`/classrooms/${selectedClassroom?.id}`, { banner_url: bannerUrl });
    },
    onSuccess: (res) => {
      setSelectedClassroom(res.data);
      queryClient.invalidateQueries({ queryKey: ['classrooms'] });
    }
  });

  const handleJoin = () => joinMutation.mutate(joinCode);
  
  const handleCreateClassroom = (name: string, description: string, courseId: string, teacherId: string) => {
    createClassroomMutation.mutate({ name, description, course_id: courseId || null, teacher_id: teacherId || null });
  };

  const handleAssignTeacher = (teacherId: string) => assignTeacherMutation.mutate(teacherId);

  const handleCreatePost = (content: string, type: 'announcement' | 'file' | 'poll' | 'assignment', extra?: any) => {
    createPostMutation.mutate({ content, post_type: type, ...extra });
  };

  const handleDeletePost = (postId: string) => {
    if (!selectedClassroom || !window.confirm('هل أنت متأكد من حذف هذا المنشور؟')) return;
    deletePostMutation.mutate(postId);
  };

  const handleUploadMaterial = (title: string, description: string, type: Material['type'], url: string) => {
    uploadMaterialMutation.mutate({ title, description, type, url });
  };

  const handleVote = (postId: string, optionIndex: number) => voteMutation.mutate({ postId, optionIndex });

  const handleSubmitAssignment = (postId: string, fileUrl: string, fileName: string) => {
    submitAssignmentMutation.mutate({ postId, fileUrl, fileName });
  };

  const handleGradeSubmission = (submissionId: string, grade: number, feedback: string) => {
    gradeSubmissionMutation.mutate({ submissionId, grade, feedback });
  };

  const handleUpdateBanner = async () => {
    if (!selectedClassroom) return;
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${selectedClassroom.id}-banner-${Date.now()}.${fileExt}`;
        const { data, error } = await supabase.storage.from('Lectures').upload(`banners/${fileName}`, file);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('Lectures').getPublicUrl(data.path);
        updateBannerMutation.mutate(publicUrl);
      } catch (err) {
        console.error('Failed to update banner', err);
        alert('فشل في تحديث صورة الغلاف.');
      }
    };
    input.click();
  };

  const loading = loadingClassrooms;
  const postsLoading = loadingPosts;
  const matLoading = loadingMaterials;
  const studentsLoading = loadingStudents;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
      </div>
    );
  }

  if (selectedClassroom) {
    const gradientIdx = classrooms.indexOf(selectedClassroom) % gradients.length;
    const teacher = (selectedClassroom as any).profiles;

    return (
      <div className="space-y-6">
        {/* Classroom Header */}
        <div 
          className={cn(
            "rounded-2xl p-8 text-white relative overflow-hidden shadow-lg min-h-[240px] flex flex-col justify-between", 
            !selectedClassroom.banner_url && "bg-gradient-to-r " + gradients[gradientIdx]
          )}
          style={selectedClassroom.banner_url ? { 
            backgroundImage: `url(${selectedClassroom.banner_url})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center'
          } : {}}
        >
          <div className={cn("absolute inset-0", selectedClassroom.banner_url ? "bg-black/40 backdrop-blur-[1px]" : "bg-black/10")} />
          <div className="relative z-10 flex justify-between items-start h-full">
            <div className="flex flex-col h-full justify-between">
              <div>
                <button onClick={() => setSelectedClassroom(null)} className="flex items-center gap-1 text-white/80 hover:text-white text-sm mb-4 bg-white/10 px-3 py-1 rounded-full backdrop-blur-sm transition-colors w-fit">
                  <ArrowLeft className="w-4 h-4 ml-1" /> الرجوع للقاعات
                </button>
                <h1 className="text-4xl font-black drop-shadow-md">{selectedClassroom.name}</h1>
                <p className="text-white/90 mt-2 text-lg font-medium drop-shadow-sm">{selectedClassroom.description}</p>
              </div>
              
              <div className="flex flex-wrap items-center gap-4 mt-8">
                <div className="bg-white/10 border border-white/20 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2">
                  <Code className="w-5 h-5 text-indigo-200" />
                  <div>
                    <span className="text-[10px] text-white/70 block uppercase tracking-wider font-bold">رمز الانضمام</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xl tracking-wider">{selectedClassroom.class_code}</span>
                      <button onClick={() => copyCode(selectedClassroom.class_code)} className="hover:bg-white/20 p-1 rounded-lg transition-colors">
                        {copiedCode === selectedClassroom.class_code ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white/10 border border-white/20 backdrop-blur-md px-4 py-2 rounded-2xl flex items-center gap-2">
                  <Users className="w-5 h-5 text-indigo-200" />
                  <div>
                    <span className="text-[10px] text-white/70 block uppercase tracking-wider font-bold">الطلاب</span>
                    <span className="font-bold text-lg">{(selectedClassroom as any).enrolled_count || 0} طالباً</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <div className="flex gap-2">
                {(isTeacher || isHod || isDean) && (
                  <button 
                    onClick={handleUpdateBanner}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md p-2.5 rounded-2xl transition-all group"
                    title="تغيير صورة الغلاف"
                  >
                    <Upload className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                )}
                
                {canManageClassrooms && (
                  <button 
                    onClick={() => setShowAssignModal(true)}
                    className="bg-white/10 hover:bg-white/20 border border-white/20 backdrop-blur-md p-2.5 rounded-2xl transition-all group"
                    title="إضافة تدريسي"
                  >
                    <UserPlus className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  </button>
                )}
              </div>

              {teacher && (
                <div className="mt-auto bg-white/10 border border-white/20 backdrop-blur-md p-3 rounded-2xl flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center font-bold border border-white/30">
                    {teacher.full_name?.charAt(0)}
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-white/70 block font-bold">الأستاذ المشرف</span>
                    <span className="font-bold text-sm block">{teacher.full_name_ar || teacher.full_name}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content - Stream & Materials */}
          <div className="lg:col-span-2 space-y-6">
            
            <div className="flex gap-6 border-b border-gray-100">
              <button 
                onClick={() => setActiveTab('stream')}
                className={cn(
                  "pb-4 text-sm font-bold transition-all relative",
                  activeTab === 'stream' ? "text-indigo-600" : "text-gray-500 hover:text-gray-700 hover:pb-4"
                )}
              >
                ساحة المشاركات
                {activeTab === 'stream' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
              </button>
              <button 
                onClick={() => setActiveTab('students')}
                className={cn(
                  "pb-4 text-sm font-bold transition-all relative",
                  activeTab === 'students' ? "text-indigo-600" : "text-gray-500 hover:text-gray-700 hover:pb-4"
                )}
              >
                الطلاب المنضمون
                <span className="mr-2 text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">{students.length}</span>
                {activeTab === 'students' && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-600 rounded-full" />}
              </button>
            </div>

            {activeTab === 'stream' ? (
              <>
                {/* Create Post Card */}
                {canPost && (
                  <div className="bg-white rounded-2xl border-2 border-dashed border-gray-200 p-4 hover:border-indigo-300 transition-colors cursor-pointer group" onClick={() => setShowPostModal(true)}>
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-400 group-hover:bg-indigo-50 group-hover:text-indigo-500 transition-colors">
                        <Plus className="w-6 h-6" />
                      </div>
                      <span className="text-gray-500 font-medium">شارك إعلاناً أو ملفاً مع طلابك...</span>
                    </div>
                  </div>
                )}

                {/* Stream / Posts */}
                <div className="space-y-4">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Megaphone className="w-5 h-5 text-indigo-600" />
                    ساحة المشاركات
                  </h2>
                  
                  {postsLoading ? (
                    <div className="flex justify-center p-12">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                      <Globe className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="text-gray-500">لا توجد منشورات حالياً في هذا الصف.</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {posts.map(post => (
                        <div key={post.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">
                                {(post as any).profiles?.full_name?.charAt(0) || 'U'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="font-bold text-gray-900">{(post as any).profiles?.full_name_ar || (post as any).profiles?.full_name}</h4>
                                  {post.author_id === currentUser?.id && (
                                    <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-bold">منشورك</span>
                                  )}
                                </div>
                                <span className="text-xs text-gray-500">{new Date(post.created_at).toLocaleString('ar-IQ')}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className={cn(
                                "px-2 py-1 rounded-lg text-xs font-bold",
                                post.post_type === 'announcement' ? "bg-amber-100 text-amber-700" : 
                                post.post_type === 'poll' ? "bg-orange-100 text-orange-700" :
                                post.post_type === 'assignment' ? "bg-emerald-100 text-emerald-700" :
                                "bg-blue-100 text-blue-700"
                              )}>
                                {post.post_type === 'announcement' ? 'إعلان' : 
                                 post.post_type === 'poll' ? 'استفتاء' : 
                                 post.post_type === 'assignment' ? 'واجب دراسي' : 
                                 'ملف تعليمي'}
                              </span>
                              
                              {(post.author_id === currentUser?.id || isHod || isDean) && (
                                <button 
                                  onClick={() => handleDeletePost(post.id)}
                                  className="p-1.5 hover:bg-red-50 text-gray-400 hover:text-red-500 rounded-lg transition-colors"
                                  title="حذف المنشور"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </div>
                          
                          <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {post.content}
                          </div>

                          {/* Poll Section */}
                          {post.post_type === 'poll' && post.poll_options && (
                            <div className="mt-4 space-y-2">
                              {post.poll_options.map((option, idx) => {
                                const totalVotes = post.poll_responses?.length || 0;
                                const optionVotes = post.poll_responses?.filter(r => r.option_index === idx).length || 0;
                                const percentage = totalVotes > 0 ? (optionVotes / totalVotes) * 100 : 0;
                                const hasVoted = post.poll_responses?.some(r => r.user_id === currentUser?.id && r.option_index === idx);
                                
                                return (
                                  <button
                                    key={idx}
                                    onClick={() => handleVote(post.id, idx)}
                                    className={cn(
                                      "w-full relative h-10 rounded-xl border transition-all text-right px-4 group overflow-hidden",
                                      hasVoted ? "border-indigo-500 bg-indigo-50/30" : "border-gray-100 hover:border-indigo-200"
                                    )}
                                  >
                                    <div 
                                      className={cn("absolute inset-y-0 right-0 transition-all duration-500", hasVoted ? "bg-indigo-100/50" : "bg-gray-50")} 
                                      style={{ width: `${percentage}%` }} 
                                    />
                                    <div className="relative flex items-center justify-between h-full text-sm">
                                      <span className={cn("font-medium", hasVoted ? "text-indigo-700" : "text-gray-700")}>{option}</span>
                                      <span className="text-xs text-gray-400 font-mono">{Math.round(percentage)}%</span>
                                    </div>
                                  </button>
                                );
                              })}
                              <p className="text-[10px] text-gray-400 mt-2 italic text-left">إجمالي الأصوات: {post.poll_responses?.length || 0}</p>
                            </div>
                          )}

                          {/* Assignment Section */}
                          {post.post_type === 'assignment' && (
                            <div className="mt-4 p-4 rounded-xl bg-emerald-50 border border-emerald-100 space-y-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2 text-emerald-700">
                                  <ClipboardList className="w-5 h-5" />
                                  <span className="font-bold">واجب دراسي</span>
                                </div>
                                <div className="text-xs text-emerald-600 font-medium">
                                  الدرجة: {post.max_score || 100} | 
                                  الموعد: {post.due_date ? new Date(post.due_date).toLocaleString('ar-IQ') : 'غير محدد'}
                                </div>
                              </div>

                              {isTeacher || isHod || isDean ? (
                                <div className="space-y-3">
                                  <h5 className="text-xs font-bold text-gray-700 border-b border-emerald-100 pb-2">تسليمات الطلاب ({post.submissions?.length || 0})</h5>
                                  <div className="space-y-2 max-h-60 overflow-y-auto">
                                    {(post.submissions || []).map(sub => (
                                      <div key={sub.id} className="bg-white p-3 rounded-xl border border-emerald-100 flex items-center justify-between group">
                                        <div className="flex items-center gap-3">
                                          <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600 text-[10px] font-bold">
                                            {sub.profiles?.full_name?.charAt(0)}
                                          </div>
                                          <div>
                                            <p className="text-sm font-bold text-gray-900">{sub.profiles?.full_name_ar || sub.profiles?.full_name}</p>
                                            <a href={sub.file_url} target="_blank" className="text-[10px] text-indigo-500 hover:underline flex items-center gap-1">
                                              <Download className="w-3 h-3" /> {sub.file_name}
                                            </a>
                                          </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          {sub.grade !== null && sub.grade !== undefined ? (
                                            <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-lg">
                                              {sub.grade} / {post.max_score}
                                            </span>
                                          ) : (
                                            <button 
                                              onClick={() => {
                                                const grade = prompt(`أدخل درجة الطالب ${sub.profiles?.full_name_ar} (من ${post.max_score}):`);
                                                if (grade) handleGradeSubmission(sub.id, parseInt(grade), '');
                                              }}
                                              className="text-[10px] bg-indigo-600 text-white px-3 py-1.5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                              تصحيح
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                    {(post.submissions || []).length === 0 && (
                                      <p className="text-xs text-gray-400 text-center italic py-4">لا توجد تسليمات بعد.</p>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <div className="pt-2">
                                  {post.submissions && post.submissions.length > 0 ? (
                                    <div className="bg-white p-4 rounded-xl border border-emerald-200">
                                      <div className="flex items-center justify-between mb-2">
                                        <span className="text-xs font-bold text-gray-700">حالة التسليم:</span>
                                        <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-bold">تم التسليم</span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-gray-500">{post.submissions[0].file_name}</span>
                                        {post.submissions[0].grade !== null && (
                                          <span className="text-sm font-bold text-indigo-600">الدرجة: {post.submissions[0].grade} / {post.max_score}</span>
                                        )}
                                      </div>
                                      <button 
                                        className="mt-3 w-full py-2 text-xs font-bold text-indigo-600 hover:bg-indigo-50 border border-indigo-100 rounded-lg transition-colors"
                                        onClick={() => {
                                          const input = document.createElement('input');
                                          input.type = 'file';
                                          input.onchange = async (e: any) => {
                                            const file = e.target.files[0];
                                            if (!file) return;
                                            const { data, error } = await supabase.storage.from('Lectures').upload(`submissions/${Date.now()}-${file.name}`, file);
                                            if (error) return alert('خطأ في الرفع');
                                            const { data: { publicUrl } } = supabase.storage.from('Lectures').getPublicUrl(data.path);
                                            handleSubmitAssignment(post.id, publicUrl, file.name);
                                          };
                                          input.click();
                                        }}
                                      >
                                        إعادة تسليم
                                      </button>
                                    </div>
                                  ) : (
                                    <button 
                                      className="w-full py-3 bg-emerald-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-100"
                                      onClick={() => {
                                        const input = document.createElement('input');
                                        input.type = 'file';
                                        input.onchange = async (e: any) => {
                                          const file = e.target.files[0];
                                          if (!file) return;
                                          const { data, error } = await supabase.storage.from('Lectures').upload(`submissions/${Date.now()}-${file.name}`, file);
                                          if (error) return alert('خطأ في الرفع');
                                          const { data: { publicUrl } } = supabase.storage.from('Lectures').getPublicUrl(data.path);
                                          handleSubmitAssignment(post.id, publicUrl, file.name);
                                        };
                                        input.click();
                                      }}
                                    >
                                      <Upload className="w-4 h-4" /> تسليم الواجب الآن
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {post.file_url && post.post_type !== 'assignment' && (
                            <a 
                              href={post.file_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="mt-4 flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50 hover:bg-white hover:border-indigo-200 transition-all group"
                            >
                              <div className="w-10 h-10 rounded-lg bg-white flex items-center justify-center shadow-sm group-hover:text-indigo-600">
                                <FileText className="w-6 h-6" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-gray-900 truncate">تحميل الملف المرفق</p>
                                <p className="text-xs text-gray-500 uppercase">{post.file_type || 'ملف مربوط'}</p>
                              </div>
                            </a>
                          )}

                          {/* Comments Section */}
                          <CommentSection postId={post.id} currentUser={currentUser} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                    <Users className="w-5 h-5 text-indigo-600" />
                    الطلاب المنضمون
                  </h2>
                  <span className="text-sm text-gray-500">{students.length} طالب</span>
                </div>

                {studentsLoading ? (
                  <div className="flex justify-center p-12">
                    <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
                  </div>
                ) : students.length === 0 ? (
                  <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                    <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Users className="w-8 h-8 text-gray-300" />
                    </div>
                    <p className="text-gray-500 font-medium">لا يوجد طلاب منضمون حالياً.</p>
                    <p className="text-sm text-gray-400 mt-1">شارك رمز الصف مع الطلاب ليتمكنوا من الانضمام.</p>
                  </div>
                ) : (
                  <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
                    <div className="divide-y divide-gray-100">
                      {students.map((student) => (
                        <div key={student.id} className="p-4 flex items-center gap-4 hover:bg-gray-50 transition-colors group">
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-indigo-50 to-blue-50 flex items-center justify-center text-indigo-600 font-bold border border-indigo-100 group-hover:scale-110 transition-transform">
                            {student.full_name?.charAt(0) || student.email?.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900">{student.full_name_ar || student.full_name || 'طالب مجهول'}</h4>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{student.email}</span>
                              {student.student_id && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-gray-300" />
                                  <span className="font-mono">{student.student_id}</span>
                                </>
                              )}
                            </div>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-bold">نشط</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Sidebar - Materials & Teachers */}
          <div className="space-y-6">
            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-gray-900 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-indigo-600" />
                  المواد الدراسية
                </h3>
                {canPost && (
                  <button onClick={() => setShowUploadModal(true)} className="p-1.5 hover:bg-gray-100 rounded-lg text-indigo-600 transition-colors">
                    <Plus className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {matLoading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-5 h-5 text-indigo-600 animate-spin" />
                </div>
              ) : materials.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4">لا توجد ملفات مرفوعة.</p>
              ) : (
                <div className="space-y-2">
                  {materials.map(m => (
                    <a key={m.id} href={m.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 transition-colors">
                      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center shrink-0", materialColors[m.type])}>
                        <FileText className="w-4 h-4" />
                      </div>
                      <span className="text-sm text-gray-700 truncate font-medium">{m.title}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
              <h3 className="font-bold text-gray-900 flex items-center gap-2 mb-4">
                <Shield className="w-5 h-5 text-indigo-600" />
                الكادر التدريسي
              </h3>
              <div className="space-y-3">
                {assignedTeachers.map(at => (
                  <div key={at.teacher_id} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 text-xs font-bold ring-2 ring-white shadow-sm">
                      {at.profiles?.full_name?.charAt(0)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{at.profiles?.full_name_ar || at.profiles?.full_name}</p>
                      <p className="text-[10px] text-gray-400 uppercase tracking-wider">{at.profiles?.role}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Modals... */}
        {showPostModal && <CreatePostModal onClose={() => setShowPostModal(false)} onSubmit={handleCreatePost} />}
        {showAssignModal && (
          <AssignTeacherModal 
            onClose={() => setShowAssignModal(false)} 
            onAssign={handleAssignTeacher}
            currentUser={currentUser}
            alreadyAssigned={assignedTeachers.map(t => t.teacher_id)}
          />
        )}
        {showUploadModal && (
          <UploadModal
            onClose={() => setShowUploadModal(false)}
            onUpload={handleUploadMaterial}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-indigo-600" />
            الصفوف الالكترونية
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {canManageClassrooms ? 'إنشاء وإدارة الصفوف الالكترونية الخاصة بك' : 'انضم إلى القاعات والوصول إلى المواد الدراسية'}
          </p>
        </div>
        <div className="flex gap-2">
          {isStudent && (
            <button
              onClick={() => setShowJoinModal(true)}
              className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
            >
              <Plus className="w-4 h-4" /> انضمام إلى قاعة
            </button>
          )}
          {canManageClassrooms && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700"
            >
              <Plus className="w-4 h-4" /> إنشاء قاعة جديدة
            </button>
          )}
        </div>
      </div>

      {classrooms.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-600">لا توجد قاعات حالياً</h3>
          <p className="text-gray-400 mt-1">
            {canManageClassrooms ? 'ابدأ بإنشاء أول قاعة افتراضية لطلابك.' : 'يمكنك الانضمام إلى قاعة باستخدام الرمز المخصص.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {classrooms.map((cls, idx) => {
            const teacher = (cls as any).profiles;
            return (
              <div
                key={cls.id}
                onClick={() => setSelectedClassroom(cls)}
                className="bg-white rounded-xl border border-gray-200 overflow-hidden hover:shadow-lg transition-all text-right group cursor-pointer"
              >
                <div 
                  className={cn("h-28 p-4 relative", !cls.banner_url && "bg-gradient-to-r " + gradients[idx % gradients.length])}
                  style={cls.banner_url ? { 
                    backgroundImage: `url(${cls.banner_url})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                  } : {}}
                >
                  <div className={cn("absolute inset-0", cls.banner_url ? "bg-black/30" : "bg-black/10")} />
                  <div className="relative z-10">
                    <h3 className="font-bold text-white text-lg drop-shadow-sm">{cls.name}</h3>
                    <p className="text-white/80 text-sm mt-1 font-medium drop-shadow-sm">{(cls as any).courses?.code || cls.code}</p>
                  </div>
                </div>
                <div className="p-4">
                  <p className="text-sm text-gray-600 line-clamp-2 mb-3">{cls.description}</p>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 flex items-center gap-1">
                      <Users className="w-3.5 h-3.5" /> {(cls as any).enrolled_count || 0} طالب
                    </span>
                  </div>
                  {canManageClassrooms && (
                    <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-400">رمز القاعة:</span>
                      <span className="font-mono font-bold text-indigo-600 text-sm flex items-center gap-1">
                        {cls.class_code}
                        <button
                          onClick={(e) => { e.stopPropagation(); copyCode(cls.class_code); }}
                          className="hover:bg-indigo-50 p-1 rounded"
                        >
                          {copiedCode === cls.class_code ? <Check className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </span>
                    </div>
                  )}
                  {teacher && (
                    <p className="text-xs text-gray-400 mt-2">الأستاذ: {teacher.full_name}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Join Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => { setShowJoinModal(false); setJoinError(''); }}>
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-bold text-gray-900">الانضمام إلى قاعة</h3>
              <button onClick={() => { setShowJoinModal(false); setJoinError(''); }} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4 text-right">أدخل رمز القاعة الذي زودك به الأستاذ.</p>
            <input
              type="text"
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.toUpperCase()); setJoinError(''); }}
              placeholder="أدخل الرمز هنا"
              className="w-full border border-gray-300 rounded-lg px-4 py-3 text-center font-mono text-lg tracking-widest focus:ring-2 focus:ring-indigo-500"
              maxLength={8}
            />
            {joinError && <p className="text-sm text-red-500 mt-2 text-right">{joinError}</p>}
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setShowJoinModal(false); setJoinError(''); }} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium">إلغاء</button>
              <button onClick={handleJoin} className="flex-1 px-4 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700">انضمام</button>
            </div>
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateClassroomModal
          onClose={() => setShowCreateModal(false)}
          onCreate={handleCreateClassroom}
          user={currentUser}
        />
      )}
    </div>
  );
}

function CreateClassroomModal({ onClose, onCreate, user }: { onClose: () => void; onCreate: (name: string, desc: string, courseId: string, teacherId: string) => void; user: any }) {
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [courseId, setCourseId] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [courses, setCourses] = useState<Course[]>([]);
  const [teachers, setTeachers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [coursesRes, teachersRes] = await Promise.all([
          api.get('/courses'),
          api.get('/profiles/teachers')
        ]);
        
        let filteredCourses = coursesRes.data;
        if (user.role === 'hod') {
          filteredCourses = coursesRes.data.filter((c: Course) => c.department_id === user.department_id);
        }
        setCourses(filteredCourses);
        setTeachers(teachersRes.data);
      } catch (err) {
        console.error('Failed to fetch data', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">إنشاء قاعة افتراضية جديدة</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">اسم القاعة</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="مثلاً: هياكل البيانات - المرحلة الثانية" className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-right focus:ring-2 focus:ring-indigo-500 transition-all outline-none" dir="rtl" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">المادة الدراسية</label>
              <select value={courseId} onChange={e => setCourseId(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-right focus:ring-2 focus:ring-indigo-500 outline-none" dir="rtl">
                <option value="">{loading ? 'جاري التحميل...' : 'اختر المادة...'}</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.code} — {c.name_ar || c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-bold text-gray-700 mb-1">الأستاذ المشرف</label>
              <select value={teacherId} onChange={e => setTeacherId(e.target.value)} className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-right focus:ring-2 focus:ring-indigo-500 outline-none" dir="rtl">
                <option value="">اختر الأستاذ...</option>
                {teachers.map(t => <option key={t.id} value={t.id}>{t.full_name_ar || t.full_name}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">وصف القاعة</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="اكتب وصفاً مختصراً للقاعة..." className="w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm text-right focus:ring-2 focus:ring-indigo-500 outline-none" dir="rtl" />
          </div>
          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">إلغاء</button>
            <button onClick={() => { if (name) { onCreate(name, desc, courseId, teacherId); } }} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all">إنشاء القاعة</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreatePostModal({ onClose, onSubmit }: { onClose: () => void; onSubmit: (content: string, type: 'announcement' | 'file' | 'poll' | 'assignment', extra?: any) => void }) {
  const [content, setContent] = useState('');
  const [type, setType] = useState<'announcement' | 'file' | 'poll' | 'assignment'>('announcement');
  const [fileUrl, setFileUrl] = useState('');
  const [fileType, setFileType] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  
  // Extra fields
  const [maxScore, setMaxScore] = useState('100');
  const [dueDate, setDueDate] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '']);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `posts/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('Lectures')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('Lectures')
        .getPublicUrl(filePath);

      setFileUrl(publicUrl);
      setFileType(fileExt?.toUpperCase() || 'FILE');
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('فشل رفع الملف. تأكد من إعدادات الستورج وحاول مرة أخرى.');
    } finally {
      setIsUploading(false);
    }
  };

  const addOption = () => setPollOptions([...pollOptions, '']);
  const removeOption = (idx: number) => setPollOptions(pollOptions.filter((_, i) => i !== idx));
  const updateOption = (idx: number, val: string) => {
    const newOptions = [...pollOptions];
    newOptions[idx] = val;
    setPollOptions(newOptions);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl animate-in fade-in zoom-in duration-200 overflow-y-auto max-h-[90vh]" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900 font-display">مشاركة جديدة</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded-lg"><X className="w-5 h-5" /></button>
        </div>
        
        <div className="flex flex-wrap gap-2 mb-6 p-1 bg-gray-100 rounded-xl">
          {[
            { id: 'announcement', label: 'إعلان', icon: Megaphone },
            { id: 'file', label: 'ملف', icon: Upload },
            { id: 'poll', label: 'استفتاء', icon: BookOpen },
            { id: 'assignment', label: 'واجب', icon: ClipboardList }
          ].map(t => (
            <button 
              key={t.id}
              onClick={() => setType(t.id as any)}
              className={cn(
                "flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold transition-all",
                type === t.id ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              )}
            >
              <t.icon className="w-3.5 h-3.5" /> {t.label}
            </button>
          ))}
        </div>

        <div className="space-y-4">
          <textarea
            value={content}
            onChange={e => setContent(e.target.value)}
            placeholder={
              type === 'announcement' ? "اكتب إعلاناً لطلابك..." : 
              type === 'file' ? "اكتب وصفاً للملف..." :
              type === 'poll' ? "اكتب سؤال الاستفتاء..." :
              "اكتب تعليمات الواجب الدراسي..."
            }
            className="w-full border border-gray-300 rounded-xl px-4 py-3 text-sm text-right focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none"
            dir="rtl"
          />

          {type === 'poll' && (
            <div className="space-y-3 p-4 bg-orange-50 rounded-xl border border-orange-100">
              <label className="block text-xs font-bold text-orange-700 mb-1">خيارات الاستفتاء</label>
              {pollOptions.map((opt, idx) => (
                <div key={idx} className="flex gap-2">
                  <input 
                    type="text" 
                    value={opt} 
                    onChange={e => updateOption(idx, e.target.value)}
                    placeholder={`خيار ${idx + 1}`}
                    className="flex-1 border border-orange-200 rounded-lg px-3 py-2 text-sm text-right outline-none focus:border-orange-500"
                  />
                  {pollOptions.length > 2 && (
                    <button onClick={() => removeOption(idx)} className="p-2 text-orange-400 hover:text-red-500">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              <button 
                onClick={addOption}
                className="w-full py-2 border-2 border-dashed border-orange-200 rounded-lg text-xs font-bold text-orange-600 hover:bg-white transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-3.5 h-3.5" /> إضافة خيار
              </button>
            </div>
          )}

          {type === 'assignment' && (
            <div className="grid grid-cols-2 gap-4 p-4 bg-emerald-50 rounded-xl border border-emerald-100">
              <div>
                <label className="block text-xs font-bold text-emerald-700 mb-1">الدرجة القصوى</label>
                <input 
                  type="number" 
                  value={maxScore} 
                  onChange={e => setMaxScore(e.target.value)}
                  className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-sm text-center outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-emerald-700 mb-1">تاريخ التسليم</label>
                <input 
                  type="datetime-local" 
                  value={dueDate} 
                  onChange={e => setDueDate(e.target.value)}
                  className="w-full border border-emerald-200 rounded-lg px-3 py-2 text-xs text-center outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {(type === 'file' || type === 'assignment') && (
            <div className="space-y-3 p-4 bg-indigo-50/50 rounded-xl border border-indigo-100">
              <div>
                <label className="block text-xs font-bold text-indigo-700 mb-1">رفع ملف (اختياري)</label>
                <div className="relative">
                  <input 
                    type="file" 
                    onChange={handleFileChange}
                    className="hidden" 
                    id="post-file-upload"
                    disabled={isUploading}
                  />
                  <label 
                    htmlFor="post-file-upload"
                    className={cn(
                      "w-full flex items-center justify-center gap-2 border-2 border-dashed border-indigo-200 rounded-lg px-3 py-4 text-sm cursor-pointer hover:bg-white hover:border-indigo-400 transition-all",
                      isUploading && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isUploading ? (
                      <Loader2 className="w-5 h-5 animate-spin text-indigo-600" />
                    ) : (
                      <Upload className="w-5 h-5 text-indigo-600" />
                    )}
                    <span className="font-medium text-indigo-700">
                      {fileUrl ? 'تم اختيار الملف بنجاح' : 'اضغط لاختيار ملف ورفعه'}
                    </span>
                  </label>
                </div>
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <button onClick={onClose} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">إلغاء</button>
            <button 
              onClick={() => { 
                if (content) {
                  const extra: any = {};
                  if (type === 'file' || type === 'assignment') {
                    extra.file_url = fileUrl;
                    extra.file_type = fileType;
                  }
                  if (type === 'assignment') {
                    extra.max_score = parseInt(maxScore);
                    extra.due_date = dueDate || null;
                  }
                  if (type === 'poll') {
                    extra.poll_options = pollOptions.filter(o => o.trim() !== '');
                  }
                  onSubmit(content, type, extra); 
                }
              }}
              className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all disabled:opacity-50"
              disabled={!content || (type === 'poll' && pollOptions.filter(o => o.trim() !== '').length < 2) || isUploading}
            >
              {isUploading ? 'جاري الرفع...' : 'نشر الآن'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}


function AssignTeacherModal({ onClose, onAssign, currentUser, alreadyAssigned }: { 
  onClose: () => void; 
  onAssign: (teacherId: string) => void;
  currentUser: User | null;
  alreadyAssigned: string[];
}) {
  const [teachers, setTeachers] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [teacherId, setTeacherId] = useState('');
  const [loading, setLoading] = useState(true);
  const [showBulk, setShowBulk] = useState(false);

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        const res = await api.get('/profiles/teachers');
        setTeachers(res.data);
      } catch (err) {
        console.error('Failed to fetch teachers', err);
      } finally {
        setLoading(false);
      }
    };
    fetchTeachers();
  }, []);

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      const emails = text.split('\n').map(e => e.trim().toLowerCase()).filter(e => e.includes('@'));
      
      let count = 0;
      for (const email of emails) {
        const teacher = teachers.find(t => t.email?.toLowerCase() === email);
        if (teacher && !alreadyAssigned.includes(teacher.id)) {
          await onAssign(teacher.teacher_id || teacher.id);
          count++;
        }
      }
      alert(`تمت إضافة ${count} تدريسي بنجاح.`);
      onClose();
    };
    reader.readAsText(file);
  };

  const filteredTeachers = teachers.filter(t => {
    const matchesSearch = (t.full_name_ar || t.full_name || '').toLowerCase().includes(search.toLowerCase()) || 
                         (t.email || '').toLowerCase().includes(search.toLowerCase());
    return matchesSearch;
  }).sort((a, b) => {
    if (currentUser?.role === 'hod') {
      const aInDept = a.department_id === currentUser.department_id;
      const bInDept = b.department_id === currentUser.department_id;
      if (aInDept && !bInDept) return -1;
      if (!aInDept && bInDept) return 1;
    }
    return 0;
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-300" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
              <UserPlus className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-900">تعيين تدريسي</h3>
              <p className="text-xs text-gray-500">اختر تدريسي للمساهمة في هذا الصف</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg transition-colors"><X className="w-5 h-5 text-gray-400" /></button>
        </div>

        <div className="space-y-4">
          <div className="flex gap-2 p-1 bg-gray-50 rounded-xl border border-gray-100 mb-4">
            <button 
              onClick={() => setShowBulk(false)}
              className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", !showBulk ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700")}
            >
              اختيار يدوي
            </button>
            <button 
              onClick={() => setShowBulk(true)}
              className={cn("flex-1 py-2 text-xs font-bold rounded-lg transition-all", showBulk ? "bg-white shadow-sm text-indigo-600" : "text-gray-500 hover:text-gray-700")}
            >
              رفع قائمة (CSV)
            </button>
          </div>

          {!showBulk ? (
            <>
              <div className="relative">
                <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input 
                  type="text"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="ابحث عن اسم أو بريد التدريسي..."
                  className="w-full bg-gray-50 border border-gray-100 rounded-xl pl-9 pr-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-right"
                  dir="rtl"
                />
              </div>

              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {loading ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-3">
                    <Loader2 className="w-10 h-10 text-indigo-600 animate-spin" />
                    <p className="text-sm text-gray-500">جاري جلب قائمة التدريسيين...</p>
                  </div>
                ) : filteredTeachers.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <Users className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">لم يتم العثور على أي تدريسي</p>
                  </div>
                ) : filteredTeachers.map(t => {
                  const isAssigned = alreadyAssigned.includes(t.id);
                  const isMyDept = currentUser?.role === 'hod' && t.department_id === currentUser.department_id;

                  return (
                    <button
                      key={t.id}
                      onClick={() => !isAssigned && setTeacherId(t.id)}
                      className={cn(
                        "w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-right group",
                        teacherId === t.id 
                          ? "border-indigo-600 bg-indigo-50 shadow-sm" 
                          : isAssigned 
                            ? "border-gray-50 opacity-50 cursor-not-allowed bg-gray-50" 
                            : "border-gray-100 hover:border-indigo-200 hover:bg-white"
                      )}
                      disabled={isAssigned}
                    >
                      <div className={cn(
                        "w-11 h-11 rounded-full flex items-center justify-center text-lg font-bold shrink-0 transition-colors",
                        isAssigned ? "bg-gray-200 text-gray-400" : isMyDept ? "bg-emerald-100 text-emerald-700" : "bg-indigo-100 text-indigo-700"
                      )}>
                        {t.full_name?.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-bold text-gray-900 truncate">
                            {t.full_name_ar || t.full_name}
                          </p>
                          {isMyDept && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">قسمك</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 truncate">{t.email}</p>
                        <p className="text-[10px] text-gray-400">
                          {(t as any).departments?.name_ar || (t as any).departments?.name || 'بدون قسم'}
                        </p>
                      </div>
                      {isAssigned ? (
                        <span className="text-[10px] bg-gray-200 text-gray-500 px-2 py-1 rounded-lg">موجود مسبقاً</span>
                      ) : teacherId === t.id ? (
                        <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center border-2 border-indigo-600">
                          <Check className="w-3.5 h-3.5 text-white stroke-[3px]" />
                        </div>
                      ) : (
                        <div className="w-6 h-6 rounded-full border-2 border-gray-200 group-hover:border-indigo-300 transition-colors" />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div className="py-8 text-center space-y-4">
              <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2">
                <Upload className="w-8 h-8" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">رفع ملف CSV</h4>
                <p className="text-xs text-gray-500 mt-1">يجب أن يحتوي الملف على قائمة ببريد التدريسيين الإلكتروني (كل سطر بريد منفصل)</p>
              </div>
              <input 
                type="file" 
                accept=".csv,.txt" 
                className="hidden" 
                id="bulk-teachers-csv" 
                onChange={handleBulkUpload}
              />
              <label 
                htmlFor="bulk-teachers-csv"
                className="inline-block px-6 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold cursor-pointer hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
              >
                اختر الملف للرفع
              </label>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-3 border border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-colors">إلغاء</button>
            {!showBulk && (
              <button 
                onClick={() => { if (teacherId) onAssign(teacherId); }}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 shadow-md shadow-indigo-100 transition-all disabled:opacity-50 disabled:shadow-none"
                disabled={!teacherId}
              >
                تأكيد الإضافة
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function UploadModal({ onClose, onUpload }: { onClose: () => void; onUpload: (title: string, desc: string, type: Material['type'], url: string) => void }) {
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<Material['type']>('pdf');
  const [isUploading, setIsUploading] = useState(false);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `materials/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('Lectures')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('Lectures')
        .getPublicUrl(filePath);

      setUrl(publicUrl);
      if (!title) setTitle(file.name.split('.')[0]);
      
      // Auto-detect type
      if (file.type.includes('pdf')) setType('pdf');
      else if (file.type.includes('video')) setType('video');
    } catch (err) {
      console.error('Error uploading file:', err);
      alert('فشل رفع الملف. تأكد من إعدادات الستورج وحاول مرة أخرى.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-bold text-gray-900">رفع مادة تعليمية</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">رفع ملف</label>
            <div className="relative">
              <input 
                type="file" 
                onChange={handleFileChange}
                className="hidden" 
                id="material-file-upload"
                disabled={isUploading}
              />
              <label 
                htmlFor="material-file-upload"
                className={cn(
                  "w-full flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 rounded-lg px-3 py-6 text-sm cursor-pointer hover:bg-gray-50 hover:border-indigo-300 transition-all",
                  isUploading && "opacity-50 cursor-not-allowed"
                )}
              >
                {isUploading ? <Loader2 className="w-6 h-6 animate-spin text-indigo-600" /> : <Upload className="w-6 h-6 text-indigo-600" />}
                <span className="font-bold text-indigo-700">
                  {url ? 'تم رفع الملف بنجاح' : 'اختر ملفاً من جهازك للرفع'}
                </span>
              </label>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100"></span></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">أو معلومات الملف</span></div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
            <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="عنوان المادة" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right outline-none focus:ring-2 focus:ring-indigo-500" dir="rtl" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الرابط / المسار</label>
            <input type="text" value={url} onChange={e => setUrl(e.target.value)} placeholder="رابط الملف" className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-left outline-none focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">النوع</label>
            <div className="grid grid-cols-4 gap-2">
              {([['pdf', 'ملف'], ['link', 'رابط'], ['video', 'فيديو'], ['assignment', 'واجب']] as const).map(([t, label]) => {
                const Icon = materialIcons[t as Material['type']];
                return (
                  <button
                    key={t}
                    onClick={() => setType(t as Material['type'])}
                    className={cn("flex flex-col items-center gap-1 p-3 rounded-lg border-2 transition-all text-xs font-medium",
                      type === t ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:border-gray-300'
                    )}
                  >
                    <Icon className="w-5 h-5" />
                    {label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">الوصف</label>
            <textarea value={desc} onChange={e => setDesc(e.target.value)} rows={3} placeholder="اكتب وصفاً للمادة..." className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-right outline-none focus:ring-2 focus:ring-indigo-500" dir="rtl" />
          </div>
          <div className="flex gap-3 pt-2">
            <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50">إلغاء</button>
            <button 
              onClick={() => { if (title && url) { onUpload(title, desc, type, url); } }} 
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              disabled={!title || !url || isUploading}
            >
              {isUploading ? 'جاري الرفع...' : 'تأكيد الرفع'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
