<template>
  <div class="mt-8 border-t pt-6">
    <h3 class="text-xl font-semibold mb-4">Notes</h3>
    
    <!-- Add Note Form -->
    <div class="mb-6 p-4 bg-gray-50 rounded-lg">
      <div class="mb-2">
        <textarea
          v-model="newNoteContent"
          placeholder="Add a note..."
          class="w-full p-3 border rounded-md resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="3"
          :maxlength="2000"
          @keydown.ctrl.enter="handleAddNote"
        ></textarea>
      </div>
      <div class="flex justify-between items-center">
        <span class="text-sm text-gray-500">
          {{ newNoteContent.length }}/2000 characters
        </span>
        <button
          @click="handleAddNote"
          :disabled="!newNoteContent.trim() || isSubmitting"
          class="px-4 py-2 bg-blue-600 text-black rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {{ isSubmitting ? 'Posting...' : 'Post' }}
        </button>
      </div>
    </div>

    <!-- Notes List -->
    <div v-if="notes.length === 0" class="text-gray-500 text-center py-4">
      No notes yet. Be the first to add one!
    </div>
    
    <div v-else class="space-y-4">
      <div
        v-for="note in notes"
        :key="note.id"
        class="p-4 border rounded-lg bg-white"
      >
        <div class="flex justify-between items-start mb-2">
          <div class="flex items-center space-x-2">
            <span class="font-medium text-gray-900">{{ note.authorName || 'Unknown User' }}</span>
            <span class="text-sm text-gray-500">•</span>
            <span class="text-sm text-gray-500">{{ formatDate(note.createdDate) }}</span>
            <span v-if="note.modifiedDate && note.modifiedDate !== note.createdDate" class="text-sm text-gray-400">
              (edited {{ formatDate(note.modifiedDate) }})
            </span>
          </div>
          <div v-if="canEditNote(note)" class="flex space-x-2">
            <button
              @click="startEditNote(note)"
              class="text-sm text-blue-600 hover:text-blue-800"
            >
              Edit
            </button>
            <button
              @click="handleDeleteNote(note.id)"
              class="text-sm text-red-600 hover:text-red-800"
              :disabled="isDeleting === note.id"
            >
              {{ isDeleting === note.id ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
        
        <!-- Note Content -->
        <div v-if="editingNoteId !== note.id" class="whitespace-pre-wrap text-gray-800">
          {{ note.content }}
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
                @click="handleUpdateNote(note.id)"
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
import { ref, onMounted, computed } from 'vue';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';

const props = defineProps({
  taskId: { type: String, required: true },
  subtaskId: { type: String, default: null },
  currentUserId: { type: String, required: true }
});

const emit = defineEmits(['notesUpdated']);

const notes = ref([]);
const newNoteContent = ref('');
const editingNoteId = ref(null);
const editContent = ref('');
const isSubmitting = ref(false);
const isUpdating = ref(false);
const isDeleting = ref(null);

// Check if current user can edit a note (only author can edit)
const canEditNote = (note) => {
  return note.authorId === props.currentUserId;
};

// Fetch notes from backend
const fetchNotes = async () => {
  try {
    const endpoint = props.subtaskId
      ? `http://localhost:3001/api/tasks/${props.taskId}/subtasks/${props.subtaskId}/notes`
      : `http://localhost:3001/api/tasks/${props.taskId}/notes`;
    
    const response = await fetch(endpoint);
    if (response.ok) {
      const notesData = await response.json();
      
      // Enrich notes with author names
      const enrichedNotes = await Promise.all(
        notesData.map(async (note) => {
          let authorName = 'Unknown User';
          let authorId = null;
          
          if (note.author?.path) {
            try {
              const authorSnap = await getDoc(doc(db, note.author.path));
              if (authorSnap.exists()) {
                authorName = authorSnap.data().name || 'Unnamed User';
                authorId = authorSnap.id;
              }
            } catch (err) {
              console.error('Error loading note author:', err);
            }
          }
          
          return { ...note, authorName, authorId };
        })
      );
      
      notes.value = enrichedNotes;
    } else {
      console.error('Failed to fetch notes');
    }
  } catch (error) {
    console.error('Error fetching notes:', error);
  }
};

// Add a new note
const handleAddNote = async () => {
  if (!newNoteContent.value.trim()) return;
  
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert('User session not found. Please log in again.');
    return;
  }
  
  isSubmitting.value = true;
  try {
    const endpoint = props.subtaskId
      ? `http://localhost:3001/api/tasks/${props.taskId}/subtasks/${props.subtaskId}/notes`
      : `http://localhost:3001/api/tasks/${props.taskId}/notes`;
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        content: newNoteContent.value.trim(),
        authorId: currentUser.uid // Use session user ID
      })
    });
    
    if (response.ok) {
      newNoteContent.value = '';
      await fetchNotes();
      emit('notesUpdated');
    } else {
      const error = await response.json();
      alert('Failed to add note: ' + error.error);
    }
  } catch (error) {
    console.error('Error adding note:', error);
    alert('Failed to add note');
  } finally {
    isSubmitting.value = false;
  }
};

// Start editing a note
const startEditNote = (note) => {
  editingNoteId.value = note.id;
  editContent.value = note.content;
};

// Cancel editing
const cancelEdit = () => {
  editingNoteId.value = null;
  editContent.value = '';
};

// Update a note
const handleUpdateNote = async (noteId) => {
  if (!editContent.value.trim()) return;
  
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert('User session not found. Please log in again.');
    return;
  }
  
  isUpdating.value = true;
  try {
    const endpoint = props.subtaskId
      ? `http://localhost:3001/api/tasks/${props.taskId}/subtasks/${props.subtaskId}/notes/${noteId}`
      : `http://localhost:3001/api/tasks/${props.taskId}/notes/${noteId}`;
    
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
      await fetchNotes();
      emit('notesUpdated');
    } else {
      const error = await response.json();
      alert('Failed to update note: ' + error.error);
    }
  } catch (error) {
    console.error('Error updating note:', error);
    alert('Failed to update note');
  } finally {
    isUpdating.value = false;
  }
};

// Delete a note
const handleDeleteNote = async (noteId) => {
  if (!confirm('Are you sure you want to delete this note?')) return;
  
  const currentUser = getCurrentUser();
  if (!currentUser) {
    alert('User session not found. Please log in again.');
    return;
  }
  
  isDeleting.value = noteId;
  try {
    const endpoint = props.subtaskId
      ? `http://localhost:3001/api/tasks/${props.taskId}/subtasks/${props.subtaskId}/notes/${noteId}`
      : `http://localhost:3001/api/tasks/${props.taskId}/notes/${noteId}`;
    
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
      await fetchNotes();
      emit('notesUpdated');
    } else {
      const error = await response.json();
      alert('Failed to delete note: ' + error.error);
    }
  } catch (error) {
    console.error('Error deleting note:', error);
    alert('Failed to delete note');
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
  fetchNotes();
});

// Expose fetchNotes for parent component to refresh
defineExpose({
  fetchNotes
});
</script>