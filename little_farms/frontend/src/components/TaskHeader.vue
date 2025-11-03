<template>
  <div class="bg-card border-b border-border p-6">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-semibold">Task Dashboard</h2>
        <p class="text-sm text-muted-foreground mt-1">
          Manage and track your team's tasks and projects
        </p>
      </div>
      <!-- Replace the Bell + Notifications block with this -->
      <div class="flex relative">
        <button
          class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-9 px-4 relative"
          @click="toggleNotifications"
        >
          <Bell class="w-4 h-4" />
          <span 
            v-if="notifications.some(n => n.status === 'unread')"
            class="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full w-4 h-4 flex items-center justify-center"
          >
            {{ unreadCount }}
          </span>
        </button>

        <div
          v-if="showNotifications"
          class="absolute right-full mr-2 bottom-auto top-full w-72 rounded-md border bg-popover text-popover-foreground shadow-md z-50 max-h-64 overflow-y-auto"
        >
          <div class="p-2">
            <div 
              v-if="notifications.length === 0" 
              class="text-center text-sm text-muted-foreground py-2"
            >
              No upcoming deadlines notifications yet.
            </div>

            <div 
              v-for="notif in notifications" 
              :key="notif.id"
              :class="[ 
                'text-sm p-2 rounded-md cursor-pointer transition-colors border mb-1', 
                notif.status === 'unread' ? 'bg-red-50 border-red-300' : 'bg-white border-gray-200' 
              ]"
            >
              <div class="mb-1">
                <div class="text-sm font-medium text-gray-900">
                  {{ notif.title || 'Notification' }}
                </div>
                <div class="whitespace-pre-wrap break-words text-sm text-gray-700 mt-1">
                  {{ notif.content || notif.body }}
                </div>
              </div>
               <div class="text-xs text-muted-foreground mt-1">
                 {{ formatDate(notif.createdAt) }}
               </div>
              <button
                v-if="notif.status === 'unread'"
                class="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 underline"
                @click.stop="acknowledgeNotification(notif.id)"
              >
                Acknowledge
              </button>
            </div>
          </div>
        </div>

        <!-- More Menu -->
        <div class="relative">
          <button 
            class="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all border bg-background text-foreground hover:bg-accent hover:text-accent-foreground h-9 px-4"
            @click="showDropdown = !showDropdown"
          >
            <MoreVertical class="w-4 h-4" />
          </button>

          <div 
            v-if="showDropdown"
            class="absolute right-0 top-full mt-2 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md z-50"
            @click="showDropdown = false"
          >
            <div class="relative flex items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer">Export Tasks</div>
            <div class="relative flex items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer">Import Tasks</div>
            <div class="h-px bg-border my-1" />
            <div class="relative flex items-center rounded-sm px-2 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground cursor-pointer">Settings</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { getAuth } from 'firebase/auth';
import { Bell, MoreVertical } from 'lucide-vue-next';
import ws from '../../webSocket';

const showDropdown = ref(false);
const showNotifications = ref(false);
const notifications = ref([]);

const unreadCount = computed(() =>
  notifications.value.filter((n) => n.status === 'unread').length
);

/** Format Firestore timestamp */
const formatDate = (timestamp) => {
  if (!timestamp) return '';
  const date = timestamp._seconds
    ? new Date(timestamp._seconds * 1000)
    : new Date(timestamp);
  return date.toLocaleString();
};

/** Fetch notifications securely */
const fetchNotifications = async () => {
  try {
    const userSession = JSON.parse(sessionStorage.getItem('userSession'));
    if (!userSession) {
      console.warn('⚠️ No user session found in storage');
      return;
    }

    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) {
      console.warn('⚠️ No authenticated user found.');
      return;
    }

    const token = await user.getIdToken();

    const res = await fetch('http://localhost:3001/api/notifications', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `Failed: ${res.status}`);
    }

    const data = await res.json();
    notifications.value = data.items || [];
    // console.log(`✅ Notifications fetched:`, notifications.value.length);
  } catch (err) {
    console.error('❌ Failed to fetch notifications:', err);
  }
};

/** Mark notification as read */
const acknowledgeNotification = async (notifId) => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (!user) return;

    const token = await user.getIdToken();

    const res = await fetch(`http://localhost:3001/api/notifications/${notifId}/acknowledge`, {
      method: 'PATCH',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || `Failed: ${res.status}`);
    }

    // update local state without refetching everything
    const notif = notifications.value.find(n => n.id === notifId);
    if (notif) notif.status = 'read';
    // console.log(`✅ Notification ${notifId} marked as read`);
  } catch (err) {
    console.error('❌ Failed to acknowledge notification:', err);
  }
};

/** Toggle dropdown + fetch notifications */
const toggleNotifications = async () => {
  showNotifications.value = !showNotifications.value;
  if (showNotifications.value) {
    await fetchNotifications();
  } 
};

/** Listen for WebSocket triggers */
onMounted(() => {
  if (!ws) {
    console.warn('⚠️ WebSocket not initialized');
    return;
  }

  ws.addEventListener('message', async (event) => {
    try {
      const data = JSON.parse(event.data);
      if (data.type === 'notification') {
        // console.log('🔔 WS: reminder event received — refreshing notifications');
        await fetchNotifications();
      }
    } catch (err) {
      console.error('WS message parse error:', err);
    }
  });

  // Initial fetch on mount
  fetchNotifications();
});
</script>
