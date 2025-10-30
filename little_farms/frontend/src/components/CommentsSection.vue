<template>
  <div class="mt-8 border-t pt-6">
    <h3 class="text-xl font-semibold mb-4">Comments</h3>
    
    <!-- Add Comment Form -->
    <div class="mb-6 p-4 bg-gray-50 rounded-lg">
      <div class="mb-2">
        <textarea
          v-model="newCommentContent"
          placeholder="Add a comment..."
          class="w-full p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="3"
          :maxlength="2000"
          @keydown.ctrl.enter="handleAddComment"
        ></textarea>
      </div>
      <div class="flex flex-col gap-3">
        <!-- Selected files list -->
        <div v-if="selectedFiles.length" class="space-y-2">
          <div
            v-for="(f, idx) in selectedFiles"
            :key="f.id"
            class="flex items-center justify-between rounded border bg-white px-3 py-2"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-gray-600 truncate" :title="f.file.name">📎 {{ f.file.name }}</span>
              <span class="text-xs text-gray-400">({{ formatSize(f.file.size) }})</span>
            </div>
            <div class="flex items-center gap-3">
              <div v-if="f.progress != null" class="w-32">
                <div class="h-2 w-full bg-gray-200 rounded">
                  <div class="h-2 bg-blue-500 rounded" :style="{ width: f.progress + '%' }"></div>
                </div>
              </div>
              <button class="text-sm text-red-600 hover:text-red-800" @click="removeFile(idx)">Remove</button>
            </div>
          </div>
        </div>

        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3">
            <span class="text-sm text-gray-500">
              {{ newCommentContent.length }}/2000 characters
            </span>
            <button
              type="button"
              class="flex items-center gap-2 text-sm px-3 py-2 border rounded-md hover:bg-gray-100"
              @click="triggerFilePicker"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 6.75v8.25a4.5 4.5 0 1 1-9 0V6.75a3 3 0 1 1 6 0v7.5a1.5 1.5 0 0 1-3 0V7.5h1.5v6.75a.75.75 0 0 0 1.5 0v-7.5a4.5 4.5 0 1 0-9 0v8.25a6 6 0 1 0 12 0V6.75h-1.5z"/></svg>
              Attach files
            </button>
            <input ref="fileInputRef" type="file" class="hidden" multiple @change="onFilesPicked" :accept="acceptedTypes" />
            <span class="text-xs text-gray-400">Max 3 files, ≤ 500KB each</span>
          </div>
          <button
            @click="handleAddComment"
            :disabled="!newCommentContent.trim() || isSubmitting || selectedFiles.some(f => f.uploading)"
            class="px-4 py-2 bg-blue-600 text-black rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {{ isSubmitting ? 'Posting...' : 'Post' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Comments List -->
    <div v-if="comments.length === 0" class="text-gray-500 text-center py-4">
      No comments yet. Be the first to add one!
    </div>
    
    <div v-else class="space-y-4">
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="p-4 border rounded-lg bg-white"
      >
        <div class="flex justify-between items-start mb-2">
          <div class="flex items-center space-x-2">
            <span class="font-medium text-gray-900">{{ comment.authorName || 'Unknown User' }}</span>
            <span class="text-sm text-gray-500">•</span>
            <span class="text-sm text-gray-500">{{ formatDate(comment.createdDate) }}</span>
            <span v-if="comment.modifiedDate && comment.modifiedDate !== comment.createdDate" class="text-sm text-gray-400">
              (edited {{ formatDate(comment.modifiedDate) }})
            </span>
          </div>
          <div v-if="canEditComment(comment)" class="flex space-x-2">
            <button
              @click="startEditComment(comment)"
              class="text-sm text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
            <button
              @click="handleDeleteComment(comment.id)"
              class="text-sm text-red-600 hover:text-red-800"
              :disabled="isDeleting === comment.id"
            >
              {{ isDeleting === comment.id ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
        
        <!-- Comment Content -->
        <div v-if="editingCommentId !== comment.id" class="whitespace-pre-wrap text-gray-800">
          {{ comment.content }}
          <div v-if="comment.attachments && comment.attachments.length" class="mt-2 space-y-1">
            <div v-for="att in comment.attachments" :key="att.url" class="text-sm">
              <a class="text-blue-600 hover:underline break-all" :href="att.url" target="_blank" rel="noopener">
                📎 {{ att.name || 'attachment' }}
              </a>
              <span v-if="att.size" class="text-gray-400"> ({{ formatSize(att.size) }})</span>
            </div>
          </div>
        </div>
        
        <!-- Edit Form -->
        <div v-else class="space-y-2">
          <textarea
            v-model="editContent"
            class="w-full p-2 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="3"
            :maxlength="2000"
          ></textarea>
          <div class="flex justify-between items-center">
            <span class="text-sm text-gray-500">
              {{ editContent.length }}/2000 characters
            </span>
            <div class="space-x-2">
              <button
                @click="cancelEdit"
                class="px-3 py-1 text-sm border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                @click="handleUpdateComment(comment.id)"
                :disabled="!editContent.trim() || isUpdating"
                class="px-3 py-1 text-sm bg-blue-600 text-black rounded-md hover:bg-blue-700 disabled:bg-gray-400"
              >
                {{ isUpdating ? 'Saving...' : 'Save' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
import { db, storage } from '../../firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const props = defineProps({
  taskId: { type: String, required: true },
  subtaskId: { type: String, default: null },
  currentUserId: { type: String, required: true }
});

const emit = defineEmits(['commentsUpdated']);

const comments = ref([]);
const newCommentContent = ref('');
const editingCommentId = ref(null);
const editContent = ref('');
const isSubmitting = ref(false);
const isUpdating = ref(false);
const isDeleting = ref(null);
const selectedFiles = ref([]); // [{ id, file, progress, uploading }]
const fileInputRef = ref(null);
const acceptedTypes = '.png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt';

// Check if current user can edit a comment (only author can edit)
const canEditComment = (comment) => {
  return comment.authorId === props.currentUserId;
};

// Fetch comments from backend
const fetchComments = async () => {
  try {
    const endpoint = props.subtaskId
      ? `http://localhost:3001/api/tasks/${props.taskId}/subtasks/${props.subtaskId}/comments`
      : `http://localhost:3001/api/tasks/${props.taskId}/comments`;
    
    const response = await fetch(endpoint);
    if (response.ok) {
      const commentsData = await response.json();
      
      // Enrich comments with author names
      const enrichedComments = await Promise.all(
        commentsData.map(async (comment) => {
          let authorName = 'Unknown User';
          let authorId = null;
          
          if (comment.author?.path) {
            try {
              const authorSnap = await getDoc(doc(db, comment.author.path));
              if (authorSnap.exists()) {
                authorName = authorSnap.data().name || 'Unnamed User';
                authorId = authorSnap.id;
              }
            } catch (err) {
              console.error('Error loading comment author:', err);
            }
          }
          
          return { ...comment, authorName, authorId };
        })
      );
      
      comments.value = enrichedComments;
    } else {
      console.error('Failed to fetch comments');
    }
  } catch (error) {
    console.error('Error fetching comments:', error);
  }
};

// Add a new comment
const handleAddComment = async () => {
  if (!newCommentContent.value.trim()) return;
  
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert('User session not found. Please log in again.');
    return;
  }
  
  isSubmitting.value = true;
  try {
    // Upload selected files to Firebase Storage and collect metadata
    const attachments = await uploadAllSelectedFiles();
    const endpoint = props.subtaskId
      ? `http://localhost:3001/api/tasks/${props.taskId}/subtasks/${props.subtaskId}/comments`
      : `http://localhost:3001/api/tasks/${props.taskId}/comments`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: newCommentContent.value.trim(),
        authorId: currentUser.uid, // Use session user ID
        attachments
      })
    });
    
    if (response.ok) {
      newCommentContent.value = '';
      selectedFiles.value = [];
      await fetchComments();
      emit('commentsUpdated');
    } else {
      const error = await response.json();
      alert('Failed to add comment: ' + error.error);
    }
  } catch (error) {
    console.error('Error adding comment:', error);
    alert('Failed to add comment');
  } finally {
    isSubmitting.value = false;
  }
};

// Start editing a comment
const startEditComment = (comment) => {
  editingCommentId.value = comment.id;
  editContent.value = comment.content;
};

// Cancel editing
const cancelEdit = () => {
  editingCommentId.value = null;
  editContent.value = '';
};

// Update a comment
const handleUpdateComment = async (commentId) => {
  if (!editContent.value.trim()) return;
  
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert('User session not found. Please log in again.');
    return;
  }
  
  isUpdating.value = true;
  try {
    const endpoint = props.subtaskId
      ? `http://localhost:3001/api/tasks/${props.taskId}/subtasks/${props.subtaskId}/comments/${commentId}`
      : `http://localhost:3001/api/tasks/${props.taskId}/comments/${commentId}`;
    
    const response = await fetch(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: editContent.value.trim(),
        userId: currentUser.uid // Send user ID for authorization
      })
    });
    
    if (response.ok) {
      cancelEdit();
      await fetchComments();
      emit('commentsUpdated');
    } else {
      const error = await response.json();
      alert('Failed to update comment: ' + error.error);
    }
  } catch (error) {
    console.error('Error updating comment:', error);
    alert('Failed to update comment');
  } finally {
    isUpdating.value = false;
  }
};

// Delete a comment
const handleDeleteComment = async (commentId) => {
  if (!confirm('Are you sure you want to delete this comment?')) return;
  
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert('User session not found. Please log in again.');
    return;
  }
  
  isDeleting.value = commentId;
  try {
    const endpoint = props.subtaskId
      ? `http://localhost:3001/api/tasks/${props.taskId}/subtasks/${props.subtaskId}/comments/${commentId}`
      : `http://localhost:3001/api/tasks/${props.taskId}/comments/${commentId}`;
    
    const response = await fetch(endpoint, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        userId: currentUser.uid // Send user ID for authorization
      })
    });
    
    if (response.ok) {
      await fetchComments();
      emit('commentsUpdated');
    } else {
      const error = await response.json();
      alert('Failed to delete comment: ' + error.error);
    }
  } catch (error) {
    console.error('Error deleting comment:', error);
    alert('Failed to delete comment');
  } finally {
    isDeleting.value = null;
  }
};

// Format date for display
const formatDate = (date) => {
  if (!date) return '';
  const dateObj = date instanceof Date ? date : new Date(date);
  return dateObj.toLocaleString();
};

// Add getCurrentUser function
const getCurrentUser = () => {
  try {
    const userSession = sessionStorage.getItem('userSession');
    if (userSession) {
      return JSON.parse(userSession);
    }
    return null;
  } catch (error) {
    console.error('Error getting user from session:', error);
    return null;
  }
};

onMounted(() => {
  fetchComments();
});

// Expose fetchComments for parent component to refresh
defineExpose({
  fetchComments
});

// File attachments helpers
function triggerFilePicker() {
  fileInputRef.value?.click();
}

function onFilesPicked(e) {
  const files = Array.from(e.target.files || []);
  if (!files.length) return;
  const remaining = 3 - selectedFiles.value.length;
  if (remaining <= 0) {
    alert('You can attach up to 3 files');
    e.target.value = '';
    return;
  }
  const toAdd = files.slice(0, remaining);
  const oversized = toAdd.filter(f => f.size > 500 * 1024);
  if (oversized.length) {
    alert(`Each file must be 500KB or less. Blocked: ${oversized.map(f=>f.name).join(', ')}`);
  }
  const accepted = toAdd.filter(f => f.size <= 500 * 1024);
  const withIds = accepted.map(f => ({ id: `${Date.now()}_${Math.random().toString(36).slice(2,8)}`, file: f, progress: 0, uploading: false }));
  selectedFiles.value.push(...withIds);
  e.target.value = '';
}

function removeFile(idx) {
  selectedFiles.value.splice(idx, 1);
}

async function uploadAllSelectedFiles() {
  if (!selectedFiles.value.length) return [];
  const currentUser = getCurrentUser();
  const uploads = selectedFiles.value.map(entry => uploadSingleFile(entry, currentUser?.uid));
  const results = await Promise.all(uploads);
  // Filter out failed uploads
  return results.filter(r => !!r);
}

function uploadSingleFile(entry, uid) {
  return new Promise((resolve) => {
    const f = entry.file;
    const pathParts = [
      'comments',
      props.taskId,
      props.subtaskId || 'root',
      `${Date.now()}_${uid || 'anon'}_${encodeURIComponent(f.name)}`
    ];
    const path = pathParts.join('/');
    const refObj = storageRef(storage, path);
    entry.uploading = true;
    const task = uploadBytesResumable(refObj, f, { contentType: f.type || 'application/octet-stream' });
    task.on('state_changed', (snap) => {
      if (snap.totalBytes) {
        entry.progress = Math.round((snap.bytesTransferred / snap.totalBytes) * 100);
      }
    }, (err) => {
      console.error('Upload failed:', err);
      entry.uploading = false;
      resolve(null);
    }, async () => {
      try {
        const url = await getDownloadURL(task.snapshot.ref);
        entry.uploading = false;
        entry.progress = 100;
        resolve({
          name: f.name,
          url,
          contentType: f.type || 'application/octet-stream',
          size: f.size,
          storagePath: path
        });
      } catch (e) {
        console.error('Unable to get download URL:', e);
        entry.uploading = false;
        resolve(null);
      }
    });
  });
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(1)} KB`;
  return `${(kb/1024).toFixed(1)} MB`;
}
</script>