<template>
  <div class="mt-8 border-t pt-6">
    <h3 class="text-xl font-semibold mb-4">Comments</h3>
    
    <!-- Add Comment Form -->
    <div class="mb-6 p-4 bg-card border border-border rounded-lg shadow-sm">
      <div class="mb-3">
        <textarea
          v-model="newCommentContent"
          placeholder="Add a comment..."
          class="w-full p-3 border border-border rounded-md resize-none bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
          rows="3"
          :maxlength="2000"
          @keydown.ctrl.enter="handleAddComment"
        ></textarea>
      </div>
      <div class="flex flex-col gap-3">
        <!-- Selected mentions chips -->
        <div v-if="selectedMentions.length" class="flex flex-wrap gap-2">
          <span
            v-for="m in selectedMentions"
            :key="m.id"
            class="inline-flex items-center gap-1 px-2.5 py-1 text-sm rounded-full bg-primary/10 text-primary border border-primary/20"
          >
            @{{ m.name || m.email || m.id }}
            <button class="ml-1 text-primary hover:text-primary/80 transition-colors" @click="removeMention(m.id)">×</button>
          </span>
        </div>
        <!-- Selected files list -->
        <div v-if="selectedFiles.length" class="space-y-2">
          <div
            v-for="(f, idx) in selectedFiles"
            :key="f.id"
            class="flex items-center justify-between rounded-md border border-border bg-card px-3 py-2.5 shadow-sm"
          >
            <div class="flex items-center gap-2 min-w-0">
              <span class="text-foreground truncate" :title="f.file.name">📎 {{ f.file.name }}</span>
              <span class="text-xs text-muted-foreground">({{ formatSize(f.file.size) }})</span>
            </div>
            <div class="flex items-center gap-3">
              <div v-if="f.progress != null" class="w-32">
                <div class="h-2 w-full bg-muted rounded-full overflow-hidden">
                  <div class="h-full bg-primary rounded-full transition-all" :style="{ width: f.progress + '%' }"></div>
                </div>
              </div>
              <button class="text-sm text-destructive hover:text-destructive/80 font-medium transition-colors" @click="removeFile(idx)">Remove</button>
            </div>
          </div>
        </div>

        <div class="flex justify-between items-center">
          <div class="flex items-center gap-3 flex-wrap">
            <span class="text-sm text-muted-foreground">
              {{ newCommentContent.length }}/2000 characters
            </span>
            <div class="relative">
              <button
                type="button"
                class="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-md border border-border bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                @click="toggleMentionDropdown"
              >
                <span class="font-mono text-lg leading-none">@</span>
                Mention
              </button>
              <!-- Mentions dropdown -->
              <div
                v-if="showMentionDropdown"
                class="absolute z-50 left-0 mt-2 w-72 max-h-64 overflow-hidden rounded-lg border border-border bg-popover shadow-lg"
              >
                <div class="p-2 border-b border-border bg-muted/50 sticky top-0 backdrop-blur-sm">
                  <input
                    v-model="mentionQuery"
                    type="text"
                    placeholder="Search users..."
                    class="w-full px-3 py-1.5 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring transition-shadow"
                  />
                </div>
                <div class="max-h-52 overflow-y-auto">
                  <div v-if="loadingUsers" class="p-3 text-sm text-muted-foreground">Loading users…</div>
                  <div v-else>
                    <button
                      v-for="u in filteredUsers"
                      :key="u.id"
                      class="w-full text-left px-3 py-2.5 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between transition-colors"
                      @click="toggleMention(u)"
                    >
                      <span class="truncate font-medium">{{ u.name || u.email || u.id }}</span>
                      <span v-if="selectedMentions.some(m => m.id === u.id)" class="text-primary font-semibold">✓</span>
                    </button>
                    <div v-if="!filteredUsers.length" class="p-3 text-sm text-muted-foreground text-center">No users found</div>
                  </div>
                </div>
              </div>
            </div>
            <button
              type="button"
              class="inline-flex items-center gap-2 text-sm font-medium px-3 py-2 rounded-md border border-border bg-background text-foreground shadow-sm hover:bg-accent hover:text-accent-foreground transition-colors"
              @click="triggerFilePicker"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="currentColor"><path d="M16.5 6.75v8.25a4.5 4.5 0 1 1-9 0V6.75a3 3 0 1 1 6 0v7.5a1.5 1.5 0 0 1-3 0V7.5h1.5v6.75a.75.75 0 0 0 1.5 0v-7.5a4.5 4.5 0 1 0-9 0v8.25a6 6 0 1 0 12 0V6.75h-1.5z"/></svg>
              Attach files
            </button>
            <input ref="fileInputRef" type="file" class="hidden" multiple @change="onFilesPicked" :accept="acceptedTypes" />
            <span class="text-xs text-muted-foreground">Max 3 files, ≤ 500KB each</span>
          </div>
          <button
            @click="handleAddComment"
            :disabled="!newCommentContent.trim() || isSubmitting || selectedFiles.some(f => f.uploading)"
            class="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {{ isSubmitting ? 'Posting...' : 'Post' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Comments List -->
    <div v-if="comments.length === 0" class="text-muted-foreground text-center py-8">
      No comments yet. Be the first to add one!
    </div>
    
    <div v-else class="space-y-3">
      <div
        v-for="comment in comments"
        :key="comment.id"
        class="p-4 border border-border rounded-lg bg-card shadow-sm hover:shadow-md transition-shadow"
      >
        <div class="flex justify-between items-start mb-3">
          <div class="flex items-center space-x-2">
            <span class="font-semibold text-foreground">{{ comment.authorName || 'Unknown User' }}</span>
            <span class="text-sm text-muted-foreground">•</span>
            <span class="text-sm text-muted-foreground">{{ formatDate(comment.createdDate) }}</span>
            <span v-if="comment.modifiedDate && comment.modifiedDate !== comment.createdDate" class="text-xs text-muted-foreground italic">
              (edited)
            </span>
          </div>
          <div v-if="canEditComment(comment)" class="flex space-x-3">
            <button
              @click="startEditComment(comment)"
              class="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Edit
            </button>
            <button
              @click="handleDeleteComment(comment.id)"
              class="text-sm text-destructive hover:text-destructive/80 font-medium transition-colors"
              :disabled="isDeleting === comment.id"
            >
              {{ isDeleting === comment.id ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
        
        <!-- Comment Content -->
        <div v-if="editingCommentId !== comment.id" class="whitespace-pre-wrap text-foreground leading-relaxed">
          {{ comment.content }}
          <!-- Mentioned users display -->
          <div v-if="comment.mentions && comment.mentions.length" class="mt-3 flex flex-wrap gap-2">
            <span
              v-for="u in comment.mentions"
              :key="u.id"
              class="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-primary/10 text-primary border border-primary/20"
            >
              @{{ u.name || u.email || u.id }}
            </span>
          </div>
          <div v-if="comment.attachments && comment.attachments.length" class="mt-3 space-y-1.5">
            <div v-for="att in comment.attachments" :key="att.url" class="text-sm">
              <a class="text-primary hover:text-primary/80 hover:underline break-all font-medium transition-colors inline-flex items-center gap-1" :href="att.url" target="_blank" rel="noopener">
                📎 {{ att.name || 'attachment' }}
              </a>
              <span v-if="att.size" class="text-muted-foreground text-xs ml-1">({{ formatSize(att.size) }})</span>
            </div>
          </div>
        </div>
        
        <!-- Edit Form -->
        <div v-else class="space-y-3">
          <textarea
            v-model="editContent"
            class="w-full p-3 border border-border rounded-md resize-none bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-shadow"
            rows="3"
            :maxlength="2000"
          ></textarea>
          <div class="flex justify-between items-center">
            <span class="text-sm text-muted-foreground">
              {{ editContent.length }}/2000 characters
            </span>
            <div class="flex gap-2">
              <button
                @click="cancelEdit"
                class="px-3 py-1.5 text-sm font-medium border border-border rounded-md hover:bg-accent hover:text-accent-foreground transition-colors"
              >
                Cancel
              </button>
              <button
                @click="handleUpdateComment(comment.id)"
                :disabled="!editContent.trim() || isUpdating"
                class="px-3 py-1.5 text-sm font-medium bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
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
import { ref, onMounted, computed } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
import { db, storage } from '../../firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

const props = defineProps({
  taskId: { type: String, required: true },
  subtaskId: { type: String, default: null },
  currentUserId: { type: String, required: true },
  taskName: { type: String, default: '' }
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
// Mentions state
const showMentionDropdown = ref(false);
const mentionQuery = ref('');
const allUsers = ref([]); // [{id, name, email}]
const loadingUsers = ref(false);
const selectedMentions = ref([]); // [{id, name, email}]

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
      
      // Enrich comments with author names and mentioned user names (with a simple cache)
      const userCache = new Map();
      async function resolveUserByPath(path) {
        if (!path) return null;
        if (userCache.has(path)) return userCache.get(path);
        try {
          const snap = await getDoc(doc(db, path));
          if (snap.exists()) {
            const val = { id: snap.id, name: snap.data().name || snap.data().email || snap.id, email: snap.data().email || '' };
            userCache.set(path, val);
            return val;
          }
        } catch (e) {
          console.error('Error resolving user path:', path, e);
        }
        userCache.set(path, null);
        return null;
      }

      const enrichedComments = await Promise.all(
        commentsData.map(async (comment) => {
          // Author
          let authorName = 'Unknown User';
          let authorId = null;
          if (comment.author?.path) {
            const author = await resolveUserByPath(comment.author.path);
            if (author) {
              authorName = author.name || 'Unnamed User';
              authorId = author.id;
            }
          }

          // Mentioned users
          let mentions = [];
          if (Array.isArray(comment.mentionedUsers)) {
            const resolved = await Promise.all(
              comment.mentionedUsers.map(async (refObj) => {
                const path = refObj?.path;
                const user = await resolveUserByPath(path);
                return user;
              })
            );
            mentions = resolved.filter(Boolean);
          }

          return { ...comment, authorName, authorId, mentions };
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

// Send notification after comment is posted
const sendCommentNotification = async (commentText, commenterName, mentionedUserIds) => {
  try {
    // Build personsInvolved array (mentioned users)
    const personsInvolved = mentionedUserIds || [];
    
    await fetch('http://localhost:3001/api/notifications/update/comment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        taskId: props.taskId,
        taskName: props.taskName || 'Untitled Task',
        commentText,
        commenterName,
        personsInvolved,
        timestamp: Date.now()
      })
    });
  } catch (error) {
    console.error('Error sending comment notification:', error);
    // Don't block the comment posting if notification fails
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
    
    const mentionedUserIds = selectedMentions.value.map(m => m.id);
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: newCommentContent.value.trim(),
        authorId: currentUser.uid, // Use session user ID
        attachments,
        mentionedUsers: mentionedUserIds
      })
    });
    
    if (response.ok) {
      // Send notification after successful comment post
      const commenterName = currentUser.displayName || currentUser.email || 'Unknown User';
      await sendCommentNotification(
        newCommentContent.value.trim(),
        commenterName,
        mentionedUserIds
      );
      
      newCommentContent.value = '';
      selectedFiles.value = [];
      selectedMentions.value = [];
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
  // Preload users for mentions (best effort)
  loadUsers();
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

// Mentions helpers
function toggleMentionDropdown() {
  showMentionDropdown.value = !showMentionDropdown.value;
  if (showMentionDropdown.value && allUsers.value.length === 0) {
    loadUsers();
  }
}

async function loadUsers() {
  try {
    loadingUsers.value = true;
    const res = await fetch('/api/users');
    const data = await res.json().catch(() => ([]));
    const arr = Array.isArray(data) ? data : (data.users || data.data || data.results || []);
    allUsers.value = (arr || []).map(u => ({
      id: u.uid || u.id || u.userId || u._id || u.email, // best-effort id
      name: u.name || u.displayName || '',
      email: u.email || ''
    })).filter(u => u.id);
  } catch (e) {
    console.error('Failed to load users for mentions:', e);
    allUsers.value = [];
  } finally {
    loadingUsers.value = false;
  }
}

const filteredUsers = computed(() => {
  const q = mentionQuery.value.trim().toLowerCase();
  if (!q) return allUsers.value;
  return allUsers.value.filter(u =>
    (u.name && u.name.toLowerCase().includes(q)) ||
    (u.email && u.email.toLowerCase().includes(q)) ||
    (u.id && String(u.id).toLowerCase().includes(q))
  );
});

function toggleMention(user) {
  const exists = selectedMentions.value.some(m => m.id === user.id);
  if (exists) {
    selectedMentions.value = selectedMentions.value.filter(m => m.id !== user.id);
  } else {
    selectedMentions.value.push({ id: user.id, name: user.name, email: user.email });
  }
}

function removeMention(id) {
  selectedMentions.value = selectedMentions.value.filter(m => m.id !== id);
}
</script>