"use client"

// Base URL for API requests
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api"

// Helper function to get the auth token from localStorage
const getToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("token")
  }
  return null
}

// Helper function to handle API responses
const handleResponse = async (response: Response) => {
  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong")
  }

  return data
}

// API client with methods for different endpoints
export const apiClient = {
  // Auth endpoints
  auth: {
    register: async (userData: any) => {
      const response = await fetch(`${API_BASE_URL}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      })

      return handleResponse(response)
    },

    login: async (credentials: { email: string; password: string }) => {
      const response = await fetch(`${API_BASE_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(credentials),
      })

      const data = await handleResponse(response)

      // Store token in localStorage
      if (data.sessionToken) {
        localStorage.setItem("token", data.sessionToken)
      }

      return data
    },

    logout: async () => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/logout`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      // Remove token from localStorage
      localStorage.removeItem("token")

      return handleResponse(response)
    },
  },

  // Channels endpoints
  channels: {
    getAll: async () => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/channels`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return handleResponse(response)
    },

    getById: async (channelId: string) => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/channels/${channelId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return handleResponse(response)
    },

    create: async (channelData: any) => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/channels`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(channelData),
      })

      return handleResponse(response)
    },

    delete: async (channelId: string) => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/channels/${channelId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return handleResponse(response)
    },

    getMessages: async (channelId: string) => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/channels/${channelId}/messages`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return handleResponse(response)
    },
  },

  // Messages endpoints
  messages: {
    send: async (messageData: any) => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/messages`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(messageData),
      })

      return handleResponse(response)
    },

    getDirectMessages: async (userId: string) => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/messages/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return handleResponse(response)
    },
  },

  // Users endpoints
  users: {
    getAll: async () => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/users`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return handleResponse(response)
    },

    getById: async (userId: string) => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return handleResponse(response)
    },

    updateProfile: async (profileData: any) => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/users/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(profileData),
      })

      return handleResponse(response)
    },

    updateUser: async (userId: string, userData: any) => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/users/${userId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(userData),
      })

      return handleResponse(response)
    },
  },

  // Departments endpoints
  departments: {
    getAll: async () => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/departments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return handleResponse(response)
    },

    create: async (departmentData: any) => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/departments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(departmentData),
      })

      return handleResponse(response)
    },
  },

  // Tasks endpoints
  tasks: {
    getAll: async (filters: any = {}) => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      // Build query string from filters
      const queryParams = new URLSearchParams()
      Object.entries(filters).forEach(([key, value]) => {
        if (value) {
          queryParams.append(key, value as string)
        }
      })

      const queryString = queryParams.toString() ? `?${queryParams.toString()}` : ""

      const response = await fetch(`${API_BASE_URL}/tasks${queryString}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return handleResponse(response)
    },

    getById: async (taskId: string) => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return handleResponse(response)
    },

    create: async (taskData: any) => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/tasks`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(taskData),
      })

      return handleResponse(response)
    },

    update: async (taskId: string, taskData: any) => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(taskData),
      })

      return handleResponse(response)
    },

    getComments: async (taskId: string) => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/tasks/${taskId}/comments`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return handleResponse(response)
    },

    addComment: async (commentData: any) => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/task-comments`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(commentData),
      })

      return handleResponse(response)
    },
  },

  // Notifications endpoints
  notifications: {
    getAll: async () => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      return handleResponse(response)
    },

    markAsRead: async (notificationId: string) => {
      const token = getToken()

      if (!token) {
        throw new Error("Not authenticated")
      }

      const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ read: true }),
      })

      return handleResponse(response)
    },
  },

  // Pusher config endpoint
  pusher: {
    getConfig: async () => {
      const response = await fetch(`${API_BASE_URL}/pusher-config`)
      return handleResponse(response)
    },
  },
}
