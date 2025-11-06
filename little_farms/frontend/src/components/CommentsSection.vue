<template>
  <div class="mt-8 border-t pt-6">
    <h3 class="text-xl font-semibold mb-6 text-foreground">Comments</h3>
    
    <!-- Add Comment Form -->
    <div class="mb-12 p-6 bg-card border border-border rounded-xl shadow-sm">
      <div class="mb-4">
        <textarea
          v-model="newCommentContent"
          placeholder="Add a comment..."
          class="w-full p-4 border border-border rounded-lg resize-none bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent transition-all duration-200"
          rows="3"
          :maxlength="2000"
          @keydown.ctrl.enter="handleAddComment"
        ></textarea>
      </div>
      
      <!-- Selected mentions chips -->
      <div v-if="selectedMentions.length" class="mb-4 flex flex-wrap gap-2">
        <div
          v-for="m in selectedMentions"
          :key="m.id"
          class="inline-flex items-center gap-2 px-3 py-2 text-sm rounded-full bg-primary/10 text-primary border border-primary/20"
        >
          <div class="w-5 h-5 bg-primary/20 rounded-full flex items-center justify-center">
            <span class="text-xs font-medium">@</span>
          </div>
          <span>{{ m.name || m.email || m.id }}</span>
          <button 
            class="ml-1 w-4 h-4 flex items-center justify-center text-primary hover:text-primary/80 transition-colors rounded-full hover:bg-primary/20"
            @click="removeMention(m.id)"
          >
            ×
          </button>
        </div>
      </div>
      
      <!-- Selected files list -->
      <div v-if="selectedFiles.length" class="mb-4 space-y-2">
        <div
          v-for="(f, idx) in selectedFiles"
          :key="f.id"
          class="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-4 py-3"
        >
          <div class="flex items-center gap-3 min-w-0 flex-1">
            <div class="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
              <Paperclip class="w-4 h-4 text-primary" />
            </div>
            <div class="min-w-0">
              <div class="text-sm font-medium text-foreground truncate">{{ f.file.name }}</div>
              <div class="text-xs text-muted-foreground">{{ formatSize(f.file.size) }}</div>
            </div>
          </div>
          <div class="flex items-center gap-3">
            <div v-if="f.progress != null" class="w-24">
              <div class="h-2 w-full bg-muted rounded-full overflow-hidden">
                <div 
                  class="h-full bg-primary rounded-full transition-all duration-300" 
                  :style="{ width: f.progress + '%' }"
                ></div>
              </div>
            </div>
            <button 
              class="text-sm text-destructive hover:text-destructive/80 font-medium transition-colors px-3 py-1 rounded-md hover:bg-destructive/5"
              @click="removeFile(idx)"
            >
              Remove
            </button>
          </div>
        </div>
      </div>

      <!-- First row: Character count, Mention button, Attach files button -->
      <div class="flex items-center gap-3 flex-wrap mb-4">
        <span class="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-md">
          {{ newCommentContent.length }}/2000 characters
        </span>
        
        <div class="relative">
          <button
            type="button"
            class="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
            @click="toggleMentionDropdown"
          >
            <div class="w-5 h-5 bg-primary/10 rounded flex items-center justify-center">
              <span class="text-primary font-semibold text-sm">@</span>
            </div>
            Mention
          </button>
          
          <!-- Mentions dropdown -->
          <div
            v-if="showMentionDropdown"
            class="absolute z-50 left-0 mt-2 w-80 max-h-64 overflow-hidden rounded-xl border border-border bg-popover shadow-lg"
          >
            <div class="p-3 border-b border-border bg-muted/30">
              <input
                v-model="mentionQuery"
                type="text"
                placeholder="Search users..."
                class="w-full px-3 py-2 text-sm border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent transition-all"
              />
            </div>
            <div class="max-h-48 overflow-y-auto">
              <div v-if="loadingUsers" class="p-4 text-sm text-muted-foreground text-center">
                <div class="flex items-center justify-center gap-2">
                  <div class="w-4 h-4 border-2 border-primary/20 border-t-primary rounded-full animate-spin"></div>
                  Loading users...
                </div>
              </div>
              <div v-else>
                <button
                  v-for="u in filteredUsers"
                  :key="u.id"
                  class="w-full text-left px-6 py-1 text-sm hover:bg-accent hover:text-accent-foreground flex items-center justify-between transition-colors border-b border-border last:border-b-0"
                  @click="toggleMention(u)"
                >
                  <div class="flex items-center gap-3">
                    <div class="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <span class="text-xs font-medium text-primary">
                        {{ (u.name || u.email || 'U').charAt(0).toUpperCase() }}
                      </span>
                    </div>
                    <div class="text-left">
                      <div class="font-medium text-foreground">{{ u.name || u.email || u.id }}</div>
                      <div v-if="u.email" class="text-xs text-muted-foreground">{{ u.email }}</div>
                    </div>
                  </div>
                  <div 
                    v-if="selectedMentions.some(m => m.id === u.id)" 
                    class="w-5 h-5 bg-primary text-primary-foreground rounded-full flex items-center justify-center"
                  >
                    <span class="text-xs">✓</span>
                  </div>
                </button>
                <div v-if="!filteredUsers.length" class="p-4 text-sm text-muted-foreground text-center">
                  No users found
                </div>
              </div>
            </div>
          </div>
        </div>
        
        <button
          type="button"
          class="inline-flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg border border-border bg-background text-foreground hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
          @click="triggerFilePicker"
        >
          <Paperclip class="w-4 h-4 text-primary" />
          Attach files
        </button>
        <input ref="fileInputRef" type="file" class="hidden" multiple @change="onFilesPicked" :accept="acceptedTypes" />
        
        <span class="text-xs text-muted-foreground bg-muted px-3 py-1 rounded-md">
          Max 3 files, ≤ 500KB each
        </span>
      </div>

      <!-- Second row: Post Comment button -->
      <div class="flex justify-end">
        <button
          @click="handleAddComment"
          :disabled="!newCommentContent.trim() || isSubmitting || selectedFiles.some(f => f.uploading)"
          class="px-6 py-2.5 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 font-medium transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm hover:shadow-md flex items-center gap-2"
        >
          <div v-if="isSubmitting" class="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
          {{ isSubmitting ? 'Posting...' : 'Post Comment' }}
        </button>
      </div>
    </div>

    <!-- Comments List -->
    <div v-if="comments.length === 0" class="text-center py-12 border-2 border-dashed border-border rounded-xl bg-muted/20">
      <div class="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
        <span class="text-2xl">💬</span>
      </div>
      <p class="text-muted-foreground font-medium">No comments yet</p>
      <p class="text-sm text-muted-foreground mt-1">Be the first to add a comment</p>
    </div>
    
    <div v-else class="space-y-4">
      <!-- Comments Scroller Container -->
      <div class="relative">
        <!-- Comments Container with fixed height and scroll -->
        <div 
          class="overflow-y-auto transition-all duration-300 scrollbar-thin"
          :class="{
            'max-h-96': comments.length > 4,
            'max-h-auto': comments.length <= 4
          }"
          ref="commentsContainer"
        >
          <div class="space-y-4 pb-1">
            <div
              v-for="comment in visibleComments"
              :key="comment.id"
              class="group p-6 border border-border rounded-xl bg-card hover:shadow-sm transition-all duration-200"
            >
              <div class="flex justify-between items-start mb-4">
                <div class="flex items-center space-x-3">
                  <div class="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                    <!-- <span class="text-sm font-medium text-primary">
                      {{ (comment.authorName || 'U').charAt(0).toUpperCase() }}
                    </span> -->
                  </div>
                  <div>
                    <div class="font-semibold text-foreground">{{ comment.authorName || 'Unknown User' }}</div>
                    <div class="flex items-center space-x-2 text-sm text-muted-foreground">
                      <span>{{ formatDate(comment.createdDate) }}</span>
                      <span v-if="comment.modifiedDate && comment.modifiedDate !== comment.createdDate" class="text-xs text-muted-foreground italic">
                        (edited)
                      </span>
                    </div>
                  </div>
                </div>
                
                <div v-if="canEditComment(comment)" class="flex space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                  <button
                    @click="startEditComment(comment)"
                    class="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors duration-200"
                  >
                    Edit
                  </button>
                  <button
                    @click="handleDeleteComment(comment.id)"
                    class="p-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-lg transition-colors duration-200"
                    :disabled="isDeleting === comment.id"
                  >
                    {{ isDeleting === comment.id ? 'Deleting...' : 'Delete' }}
                  </button>
                </div>
              </div>
              
              <!-- Comment Content -->
              <div v-if="editingCommentId !== comment.id" class="space-y-4">
                <div class="whitespace-pre-wrap text-foreground leading-relaxed">
                  {{ comment.content }}
                </div>
                
                <!-- Mentioned users display -->
                <div v-if="comment.mentions && comment.mentions.length" class="flex flex-wrap gap-2">
                  <div
                    v-for="u in comment.mentions"
                    :key="u.id"
                    class="inline-flex items-center gap-5 px-3 py-5 text-sm rounded-full bg-primary/10 text-primary border border-primary/20"
                  >
                    <div class="w-4 h-4 bg-primary/20 rounded-full flex items-center justify-center">
                      <span class="text-xs font-medium">@</span>
                    </div>
                    {{ u.name || u.email || u.id }}
                  </div>
                </div>
                
                <!-- Attachments -->
                <div v-if="comment.attachments && comment.attachments.length" class="space-y-2">
                  <div 
                    v-for="att in comment.attachments" 
                    :key="att.url" 
                    class="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-border"
                  >
                    <div class="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                      <Paperclip class="w-4 h-4 text-primary" />
                    </div>
                    <div class="flex-1 min-w-0">
                      <a 
                        class="text-sm font-medium text-primary hover:text-primary/80 hover:underline truncate block" 
                        :href="att.url" 
                        target="_blank" 
                        rel="noopener"
                      >
                        {{ att.name || 'attachment' }}
                      </a>
                      <span v-if="att.size" class="text-xs text-muted-foreground">({{ formatSize(att.size) }})</span>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Edit Form -->
              <div v-else class="space-y-4">
                <textarea
                  v-model="editContent"
                  class="w-full p-4 border border-border rounded-lg resize-none bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-transparent transition-all duration-200"
                  rows="3"
                  :maxlength="2000"
                ></textarea>
                <div class="flex justify-between items-center">
                  <span class="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-md">
                    {{ editContent.length }}/2000 characters
                  </span>
                  <div class="flex gap-3">
                    <button
                      @click="cancelEdit"
                      class="px-4 py-2 text-sm font-medium border border-border rounded-lg hover:bg-accent hover:text-accent-foreground transition-colors duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      @click="handleUpdateComment(comment.id)"
                      :disabled="!editContent.trim() || isUpdating"
                      class="px-4 py-2 text-sm font-medium bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-2"
                    >
                      <div v-if="isUpdating" class="w-4 h-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin"></div>
                      {{ isUpdating ? 'Saving...' : 'Save' }}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Scroll indicators -->
        <div v-if="comments.length > 4" class="flex justify-center items-center mt-4 space-x-3">
          <button
            @click="scrollComments('up')"
            :disabled="!canScrollUp"
            class="p-3 rounded-lg border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M14.707 12.707a1 1 0 01-1.414 0L10 9.414l-3.293 3.293a1 1 0 01-1.414-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 010 1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
          <span class="text-sm text-muted-foreground font-medium">
            {{ currentStartIndex + 1 }}-{{ Math.min(currentStartIndex + 4, comments.length) }} of {{ comments.length }}
          </span>
          <button
            @click="scrollComments('down')"
            :disabled="!canScrollDown"
            class="p-3 rounded-lg border border-border bg-background hover:bg-accent hover:text-accent-foreground transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fill-rule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clip-rule="evenodd"/>
            </svg>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, nextTick } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
import { db, storage } from '../../firebase';
import { ref as storageRef, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { Paperclip } from 'lucide-vue-next'; // Import Lucide Paperclip icon

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
const selectedFiles = ref([]);
const fileInputRef = ref(null);
const acceptedTypes = '.png,.jpg,.jpeg,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt';
const showMentionDropdown = ref(false);
const mentionQuery = ref('');
const allUsers = ref([]);
const loadingUsers = ref(false);
const selectedMentions = ref([]);
const currentStartIndex = ref(0);
const commentsContainer = ref(null);
const commentsPerView = 4;

// Computed properties for scrolling
const visibleComments = computed(() => {
  return comments.value.slice(currentStartIndex.value, currentStartIndex.value + commentsPerView);
});

const canScrollUp = computed(() => {
  return currentStartIndex.value > 0;
});

const canScrollDown = computed(() => {
  return currentStartIndex.value + commentsPerView < comments.value.length;
});

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
      
      // Reset scroll position when comments are loaded
      currentStartIndex.value = Math.max(0, comments.value.length - commentsPerView);
    } else {
      console.error('Failed to fetch comments, status:', response.status);
      const errorText = await response.text().catch(() => 'Unable to read error');
      console.error('Error response:', errorText);
    }
  } catch (error) {
    console.error('Error fetching comments:', error);
  }
};

// Scroll comments up or down
const scrollComments = (direction) => {
  if (direction === 'up' && canScrollUp.value) {
    currentStartIndex.value = Math.max(0, currentStartIndex.value - commentsPerView);
  } else if (direction === 'down' && canScrollDown.value) {
    currentStartIndex.value = Math.min(
      comments.value.length - commentsPerView, 
      currentStartIndex.value + commentsPerView
    );
  }
  
  // Scroll to top of container after changing visible comments
  nextTick(() => {
    if (commentsContainer.value) {
      commentsContainer.value.scrollTop = 0;
    }
  });
};

// Send notification after comment is posted
const sendCommentNotification = async (commentText, commenterName, mentionedUserIds) => {
  try {
    const personsInvolved = mentionedUserIds || [];
    
    await fetch('http://localhost:3001/api/notifications/update/comment', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        taskId: props.taskId,
        subtaskId: props.subtaskId || '',
        taskName: props.taskName || 'Untitled Task',
        commentText,
        commenterName,
        personsInvolved,
        timestamp: Date.now()
      })
    });
  } catch (error) {
    console.error('Error sending comment notification:', error);
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
        authorId: currentUser.uid,
        attachments,
        mentionedUsers: mentionedUserIds
      })
    });
    
    if (response.ok) {
      newCommentContent.value = '';
      selectedFiles.value = [];
      selectedMentions.value = [];
      
      const commenterName = currentUser.displayName || currentUser.email || 'Unknown User';
      sendCommentNotification(
        newCommentContent.value.trim(),
        commenterName,
        mentionedUserIds
      ).catch(err => console.error('Notification failed:', err));
      
      await fetchComments();
      emit('commentsUpdated');
    } else {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      alert('Failed to add comment: ' + (error.error || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error adding comment:', error);
    alert('Failed to add comment: ' + error.message);
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
        userId: currentUser.uid
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
        userId: currentUser.uid
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
      id: u.uid || u.id || u.userId || u._id || u.email,
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

<style scoped>
.scrollbar-thin::-webkit-scrollbar {
  width: 6px;
}

.scrollbar-thin::-webkit-scrollbar-track {
  background: transparent;
}

.scrollbar-thin::-webkit-scrollbar-thumb {
  background-color: var(--border);
  border-radius: 3px;
}

.scrollbar-thin::-webkit-scrollbar-thumb:hover {
  background-color: var(--muted-foreground);
}
</style>