<template>
  <div class="mt-8 border-t pt-6">
    <h3 class="text-xl font-semibold mb-4">Comments</h3>
    
    <!-- Add Comment Form -->
    <div class="mb-6 p-4 bg-gray-50 rounded-lg">
      <!-- Mentioned Users Display -->
      <div v-if="mentionedUsers.length > 0" class="mb-3 flex flex-wrap gap-2">
        <span class="text-sm font-medium text-gray-700">Mentioning:</span>
        <div
          v-for="userId in mentionedUsers"
          :key="userId"
          class="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-sm"
        >
          <span>{{ getUserName(userId) }}</span>
          <button
            @click="removeMention(userId)"
            class="hover:bg-blue-200 rounded-full p-0.5"
          >
            <X class="w-3 h-3" />
          </button>
        </div>
      </div>
      
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
      <div class="flex justify-between items-center">
        <div class="flex items-center gap-2">
          <span class="text-sm text-gray-500">
            {{ newCommentContent.length }}/2000 characters
          </span>
          <!-- Mention Users Dropdown -->
          <div class="relative">
            <button
              @click="toggleMentionDropdown"
              class="px-3 py-1 text-sm border rounded-md hover:bg-gray-100 flex items-center gap-1"
              type="button"
            >
              <span>@</span>
              <span>Mention</span>
              <ChevronDown class="w-4 h-4" />
            </button>
            
            <div
              v-if="showMentionDropdown"
              class="absolute left-0 mt-1 w-64 bg-white border rounded-md shadow-lg z-10 max-h-60 overflow-y-auto"
            >
              <div
                v-for="user in availableUsers"
                :key="user.uid"
                @click="addMention(user.uid)"
                class="px-3 py-2 hover:bg-gray-100 cursor-pointer flex items-center justify-between"
              >
                <div>
                  <div class="font-medium text-sm">{{ user.name }}</div>
                  <div class="text-xs text-gray-500">{{ user.email }}</div>
                </div>
                <Check
                  v-if="mentionedUsers.includes(user.uid)"
                  class="w-4 h-4 text-blue-600"
                />
              </div>
              <div v-if="availableUsers.length === 0" class="px-3 py-2 text-sm text-gray-500">
                No users available
              </div>
            </div>
          </div>
        </div>
        <button
          @click="handleAddComment"
          :disabled="!newCommentContent.trim() || isSubmitting"
          class="px-4 py-2 bg-blue-600 text-black rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {{ isSubmitting ? 'Posting...' : 'Post' }}
        </button>
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
          <div class="flex flex-col gap-1">
            <div class="flex items-center space-x-2">
              <span class="font-medium text-gray-900">{{ comment.authorName || 'Unknown User' }}</span>
              <span class="text-sm text-gray-500">•</span>
              <span class="text-sm text-gray-500">{{ formatDate(comment.createdDate) }}</span>
              <span v-if="comment.modifiedDate && comment.modifiedDate !== comment.createdDate" class="text-sm text-gray-400">
                (edited {{ formatDate(comment.modifiedDate) }})
              </span>
            </div>
            <!-- Display mentioned users -->
            <div v-if="comment.mentionedUserNames && comment.mentionedUserNames.length > 0" class="flex flex-wrap gap-1">
              <span class="text-xs text-gray-600">Mentioned:</span>
              <span
                v-for="(userName, index) in comment.mentionedUserNames"
                :key="index"
                class="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 rounded"
              >
                @{{ userName }}
              </span>
            </div>
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
import { ref, onMounted, computed, watch } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { X, ChevronDown, Check } from 'lucide-vue-next';

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
const mentionedUsers = ref([]);
const showMentionDropdown = ref(false);
const availableUsers = ref([]);

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
      
      // Enrich comments with author names and mentioned user names
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
          
          // Fetch mentioned user names
          let mentionedUserNames = [];
          if (comment.mentionedUsers && Array.isArray(comment.mentionedUsers)) {
            const names = await Promise.all(
              comment.mentionedUsers.map(async (userRef) => {
                if (userRef?.path) {
                  try {
                    const userSnap = await getDoc(doc(db, userRef.path));
                    if (userSnap.exists()) {
                      return userSnap.data().name || 'Unnamed User';
                    }
                  } catch (err) {
                    console.error('Error loading mentioned user:', err);
                  }
                }
                return null;
              })
            );
            mentionedUserNames = names.filter(name => name !== null);
          }
          
          return { ...comment, authorName, authorId, mentionedUserNames };
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

// Fetch available users for mentions
const fetchUsers = async () => {
  try {
    const response = await fetch('http://localhost:3001/api/users/users');
    if (response.ok) {
      const data = await response.json();
      availableUsers.value = data.data || data.users || [];
    }
  } catch (error) {
    console.error('Error fetching users:', error);
    availableUsers.value = [];
  }
};

// Toggle mention dropdown
const toggleMentionDropdown = () => {
  showMentionDropdown.value = !showMentionDropdown.value;
};

// Add a user mention
const addMention = (userId) => {
  if (!mentionedUsers.value.includes(userId)) {
    mentionedUsers.value.push(userId);
  }
  showMentionDropdown.value = false;
};

// Remove a user mention
const removeMention = (userId) => {
  mentionedUsers.value = mentionedUsers.value.filter(id => id !== userId);
};

// Get user name by ID
const getUserName = (userId) => {
  const user = availableUsers.value.find(u => u.uid === userId);
  return user ? user.name : 'Unknown User';
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
        authorId: currentUser.uid,
        mentionedUsers: mentionedUsers.value
      })
    });
    
    if (response.ok) {
      newCommentContent.value = '';
      mentionedUsers.value = [];
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
  fetchUsers();
});

// Refetch comments when parent switches between task and subtask
watch(
  () => [props.taskId, props.subtaskId],
  async (newVals, oldVals) => {
    // reset UI/editing state to avoid showing stale data
    editingCommentId.value = null;
    editContent.value = '';
    newCommentContent.value = '';
    mentionedUsers.value = [];
    showMentionDropdown.value = false;
    isSubmitting.value = false;
    isUpdating.value = false;
    isDeleting.value = null;

    // fetch comments for the newly selected task/subtask
    await fetchComments();
  }
);

// Expose fetchComments for parent component to refresh
defineExpose({
  fetchComments
});
</script>