<template>

  <div class="login-page">
    <div class="login-container">
      <h1>Sign In</h1>
      <p>Welcome back!</p>

      <!-- Error Message -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <!-- Success Message -->
      <div v-if="successMessage" class="success-message">
        {{ successMessage }}
      </div>

      <!-- Login Form -->
      <form @submit.prevent="handleLogin">
        <div class="form-group">
          <label for="email">Email Address</label>
          <input type="email" id="email" v-model="email" placeholder="Enter your email" required :disabled="loading" />
        </div>

        <div class="form-group">
          <label for="password">Password</label>
          <input type="password" id="password" v-model="password" placeholder="Enter your password" required
            :disabled="loading" />
        </div>

        <button type="submit" :disabled="loading" class="login-button">
          {{ loading ? 'Signing in...' : 'Sign In' }}
        </button>

        <button type="button" @click="handleForgotPassword" :disabled="loading" class="forgot-password-button">
          Forgot Password?
        </button>
      </form>
    </div>
  </div>
</template>

<script>
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '../../firebase'

export default {
  name: 'LoginPage',
  data() {
    return {
      email: '',
      password: '',
      loading: false,
      error: '',
      successMessage: ''
    }
  },
  methods: {
    async handleLogin() {
      this.loading = true
      this.error = ''
      this.successMessage = ''

      try {
        // Step 1: Sign in with Firebase Auth directly
        const userCredential = await signInWithEmailAndPassword(auth, this.email, this.password)
        const user = userCredential.user

        // Step 2: Get the ID token
        const idToken = await user.getIdToken()

        // Step 3: Send ID token to backend for verification
        const response = await fetch('http://localhost:3001/api/auth/verify', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token: idToken })
        })

        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Login verification failed')

        // Step 4: Store session data
        // const sessionData = {
        //   uid: "/Users/"+user.uid,
        //   email: user.email,
        //   name: data.user.name,
        //   role: data.user.role,
        //   department: data.user.department,
        //   loginTime: new Date().toISOString()
        // }
        const sessionData = {
          uid: user.uid,
          email: data.user.email,
          name: data.user.name,
          role: data.user.role,
          department: data.user.department,
          loginTime: data.user.loginTime
        }

        sessionStorage.setItem('userSession', JSON.stringify(sessionData))

        // Step 5: Redirect to dashboard
        this.successMessage = 'Login successful!'
        alert(`Welcome back, ${data.user.name || user.email}! 👋`)
        console.log('Verified user:', sessionData)

        if (this.$router) {
          this.$router.push('/all-tasks')
        }
      } catch (error) {
        console.log('Login error:', error)
        if (error.code === 'auth/invalid-credential') {
          this.error = 'Login failed. Please try again.'
          this.email = ''
          this.password=''
        } else {
          this.error = error.message || 'Login failed. Please try again.'
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

      this.loading = true
      this.error = ''
      this.successMessage = ''

      try {
        const auth = getAuth()
        await auth.sendPasswordResetEmail(this.email)
        this.successMessage = 'Password reset email sent! Check your inbox.'
      } catch (error) {
        console.error('Password reset error:', error)
        this.error = error.message || 'Failed to send password reset email'
      } finally {
        this.loading = false
      }
    },

    getUserSession() {
      const sessionData = sessionStorage.getItem('userSession')
      return sessionData ? JSON.parse(sessionData) : null
    },
  },

  mounted() {
    const existingSession = this.getUserSession()
    if (existingSession && this.$router) {
      this.$router.push('/all-tasks')
    }
  }
}
</script>


<style scoped>
.login-page {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  background-color: #f5f5f5;
}

.login-container {
  background: white;
  padding: 40px;
  border-radius: 8px;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
  width: 100%;
  max-width: 400px;
}

h1 {
  text-align: center;
  margin-bottom: 8px;
  color: #333;
}

p {
  text-align: center;
  color: #666;
  margin-bottom: 24px;
}

.error-message {
  background-color: #fee;
  color: #c33;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  border: 1px solid #fcc;
}

.success-message {
  background-color: #efe;
  color: #3c3;
  padding: 12px;
  border-radius: 4px;
  margin-bottom: 16px;
  border: 1px solid #cfc;
}

.form-group {
  margin-bottom: 16px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-weight: 500;
}

input {
  width: 100%;
  padding: 12px;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 14px;
  box-sizing: border-box;
}

input:focus {
  outline: none;
  border-color: #4a5568;
}

input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.login-button {
  width: 100%;
  padding: 12px;
  background-color: #4a5568;
  color: white;
  border: none;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  margin-top: 8px;
}

.login-button:hover:not(:disabled) {
  background-color: #2d3748;
}

.login-button:disabled {
  background-color: #cbd5e0;
  cursor: not-allowed;
}

.forgot-password-button {
  width: 100%;
  padding: 8px;
  background: none;
  border: none;
  color: #4299e1;
  font-size: 14px;
  cursor: pointer;
  margin-top: 8px;
}

.forgot-password-button:hover:not(:disabled) {
  text-decoration: underline;
}

.forgot-password-button:disabled {
  color: #cbd5e0;
  cursor: not-allowed;
}
</style>