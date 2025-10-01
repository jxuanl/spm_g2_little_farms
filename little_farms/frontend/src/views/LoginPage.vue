<template>
  <div class="login-container">
    <div class="login-card">
      <h2 class="login-title">Sign In</h2>
      <p class="welcome-text">Welcome back!</p>

      <form @submit.prevent="handleLogin" class="login-form">
        <div class="form-group">
          <label for="email" class="form-label">Email Address</label>
          <input
            type="email"
            id="email"
            v-model="email"
            placeholder="Enter your email"
            class="form-input"
            required
            :disabled="loading"
          />
        </div>

        <div class="form-group">
          <label for="password" class="form-label">Password</label>
          <input
            type="password"
            id="password"
            v-model="password"
            placeholder="Enter your password"
            class="form-input"
            required
            :disabled="loading"
          />
        </div>

        <button 
          type="submit" 
          class="login-button"
          :disabled="loading || !email || !password"
        >
          {{ loading ? 'Signing In...' : 'Sign In' }}
        </button>

        <div v-if="error" class="error-message">
          {{ error }}
        </div>

        <a href="#" @click.prevent="handleForgotPassword" class="forgot-password-link">
          Forgot Password?
        </a>
      </form>
    </div>
  </div>
</template>

<script>
import { signInWithEmailAndPassword, sendPasswordResetEmail } from '@/firebase'
import { auth } from '@/firebase'

export default {
  name: 'LoginPage',
  data() {
    return {
      email: '',
      password: '',
      loading: false,
      error: ''
    }
  },
  methods: {
    async handleLogin() {
      this.loading = true
      this.error = ''

      try {
        // Sign in with Firebase Auth
        const userCredential = await signInWithEmailAndPassword(auth, this.email, this.password)
        const user = userCredential.user
        console.log(user);


        // Call backend API to get user profile by Firebase UID
        // Assumes your backend has GET /api/auth/profile?uid=...
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: this.email })
        })

        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.error || 'Failed to fetch user profile')
        }
        
        const userData = await response.json()
          
        // Store session combining Firebase data and backend user profile
        const sessionData = {
          uid: user.uid,
          email: userData.email || user.email,
          name: userData.name || 'User',
          role: userData.role || 'staff',
          department: userData.department || 'General',
          loginTime: new Date().toISOString()
        }

        // Store in sessionStorage
        sessionStorage.setItem('userSession', JSON.stringify(sessionData))
          
        // Store in localStorage for persistence across browser sessions
        //   localStorage.setItem('userSession', JSON.stringify(sessionData))
        // Emit login event or redirect
        this.$emit('login-success', sessionData)
        if (this.$router) {
          this.$router.push('/dashboard')
          console.log('Login successful:', sessionData)
        } else {
          throw new Error('User profile not found in database')
        }

      } catch (error) {
        console.error('Login error:', error)
        
        // Handle specific Firebase error codes
        switch (error.code) {
          case 'auth/user-not-found':
            this.error = 'No account found with this email address'
            break
          case 'auth/wrong-password':
            this.error = 'Incorrect password'
            break
          case 'auth/invalid-email':
            this.error = 'Invalid email address'
            break
          case 'auth/user-disabled':
            this.error = 'This account has been disabled'
            break
          case 'auth/too-many-requests':
            this.error = 'Too many failed attempts. Please try again later'
            break
          default:
            this.error = error.message || 'Login failed. Please try again'
        }
      } finally {
        this.loading = false
      }
    },

    async handleForgotPassword() {
      if (!this.email) {
        this.error = 'Please enter your email address first'
        return
      }

      try {
        await sendPasswordResetEmail(auth, this.email)
        alert('Password reset email sent! Check your inbox.')
        this.error = ''
      } catch (error) {
        console.error('Password reset error:', error)
        this.error = 'Failed to send password reset email'
      }
    },

    // Method to get session data throughout the app
    getUserSession() {
    //   const sessionData = sessionStorage.getItem('userSession') || localStorage.getItem('userSession')
      const sessionData = sessionStorage.getItem('userSession')
      return sessionData ? JSON.parse(sessionData) : null
    },

    // Method to clear session
    logout() {
      sessionStorage.removeItem('userSession')
    //   localStorage.removeItem('userSession')
      auth.signOut()
      
      if (this.$router) {
        this.$router.push('/login')
      }
    }
  },

  // Check if user is already logged in
  mounted() {
    const existingSession = this.getUserSession()
    if (existingSession && this.$router) {
      this.$router.push('/dashboard')
    }
  }
}
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.login-card {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

.login-title {
  text-align: center;
  margin-bottom: 0.5rem;
  color: #333;
  font-size: 1.5rem;
  font-weight: 600;
}

.welcome-text {
  text-align: center;
  color: #666;
  margin-bottom: 1.5rem;
  font-size: 0.9rem;
}

.login-form {
  display: flex;
  flex-direction: column;
}

.form-group {
  margin-bottom: 1rem;
}

.form-label {
  display: block;
  margin-bottom: 0.5rem;
  color: #333;
  font-size: 0.9rem;
  font-weight: 500;
}

.form-input {
  width: 100%;
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 1rem;
  box-sizing: border-box;
  transition: border-color 0.2s;
}

.form-input:focus {
  outline: none;
  border-color: #007bff;
}

.form-input:disabled {
  background-color: #f8f9fa;
  cursor: not-allowed;
}

.login-button {
  background-color: #007bff;
  color: white;
  padding: 0.75rem;
  border: none;
  border-radius: 4px;
  font-size: 1rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
  margin-bottom: 1rem;
}

.login-button:hover:not(:disabled) {
  background-color: #0056b3;
}

.login-button:disabled {
  background-color: #6c757d;
  cursor: not-allowed;
}

.error-message {
  color: #dc3545;
  font-size: 0.875rem;
  margin-bottom: 1rem;
  text-align: center;
}

.forgot-password-link {
  text-align: center;
  color: #007bff;
  text-decoration: none;
  font-size: 0.9rem;
}

.forgot-password-link:hover {
  text-decoration: underline;
}
</style>