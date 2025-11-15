import axios, {
  AxiosError,
  AxiosInstance,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios'
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from './token-utils'

let forcedLogout = false

async function triggerSignOutRedirect() {
  if (typeof window === 'undefined') return
  if (forcedLogout) return
  forcedLogout = true

  try {
    const { signOut } = await import('next-auth/react')
    await signOut({ callbackUrl: '/login', redirect: true })
  } catch (error) {
    console.error('Failed to trigger sign out:', error)
    window.location.href = '/login'
  }
}

class ApiClient {
  private client: AxiosInstance
  private refreshPromise: Promise<string> | null = null

  constructor() {
    this.client = axios.create({
      baseURL: process.env.NEXT_PUBLIC_API_URL || 'https://api.aliasauto.kr/api/v1',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    })

    this.setupInterceptors()
  }

  private setupInterceptors() {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const token = getAccessToken()
        if (token) {
          config.headers.Authorization = `Bearer ${token}`
        }
        return config
      },
      (error) => Promise.reject(error)
    )

    this.client.interceptors.response.use(
      (response: AxiosResponse) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as (InternalAxiosRequestConfig & { _retry?: boolean }) | undefined

        if (!originalRequest || error.response?.status !== 401 || originalRequest._retry) {
          return Promise.reject(error)
        }

        originalRequest._retry = true

        try {
          const newAccessToken = await this.refreshAccessToken()
          originalRequest.headers = originalRequest.headers ?? {}
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`
          return this.client(originalRequest)
        } catch (refreshError) {
          clearTokens()
          void triggerSignOutRedirect()
          return Promise.reject(refreshError)
        }
      }
    )
  }

  // Public methods for API calls
  async googleLogin(idToken: string) {
    const response = await this.client.post('/auth/google', { idToken })
    const { accessToken, refreshToken, user } = response.data.data
    setTokens({ accessToken, refreshToken })
    return { user, accessToken, refreshToken }
  }

  async refreshTokens() {
    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    const response = await axios.post(
      `${this.client.defaults.baseURL}/auth/refresh`,
      { refreshToken }
    )

    const { accessToken, refreshToken: newRefreshToken } = response.data.data
    setTokens({ accessToken, refreshToken: newRefreshToken })
    return { accessToken, refreshToken: newRefreshToken }
  }

  private async refreshAccessToken(): Promise<string> {
    if (this.refreshPromise) {
      return this.refreshPromise
    }

    const refreshToken = getRefreshToken()
    if (!refreshToken) {
      throw new Error('No refresh token available')
    }

    this.refreshPromise = this.performRefresh(refreshToken)

    try {
      const newToken = await this.refreshPromise
      return newToken
    } finally {
      this.refreshPromise = null
    }
  }

  private async performRefresh(refreshToken: string): Promise<string> {
    const response = await axios.post(
      `${this.client.defaults.baseURL}/auth/refresh`,
      { refreshToken }
    )

    const { accessToken, refreshToken: newRefreshToken } = response.data.data
    setTokens({ accessToken, refreshToken: newRefreshToken })
    return accessToken
  }

  async getCurrentUser() {
    const response = await this.client.get('/auth/me')
    return response.data.data
  }

  // Users endpoints
  async listUsers(params?: { q?: string; page?: number; limit?: number }) {
    const response = await this.client.get('/users', { params })
    return response.data.data
  }

  async updateUserRole(userId: string, role: string) {
    const response = await this.client.patch(`/users/${userId}/role`, { role })
    return response.data.data
  }

  async deleteUser(userId: string) {
    const response = await this.client.delete(`/users/${userId}`)
    return response.data?.data
  }

  async logout() {
    const refreshToken = getRefreshToken()
    if (refreshToken) {
      try {
        await this.client.post('/auth/logout', { refreshToken })
      } catch (error) {
        console.error('Logout error:', error)
      }
    }

    clearTokens()
  }

  // Collections API methods
  async getUploadUrl(fileName: string, fileType: string) {
    const response = await this.client.post('/collections/upload-url', { fileName, fileType })
    return response.data.data
  }

  async uploadImage(file: File): Promise<{ imageUrl: string; originalSize: number; optimizedSize: number; compressionRatio: string }> {
    const formData = new FormData()
    formData.append('image', file)
    
    // For FormData, delete Content-Type header so axios can set it automatically with boundary
    const response = await this.client.post('/collections/upload-image', formData, {
      headers: {
        'Content-Type': undefined, // Remove default Content-Type so axios sets multipart/form-data with boundary
      },
    })
    
    return response.data.data
  }

  async listCollections(params?: { page?: number; limit?: number; authorId?: string }) {
    const response = await this.client.get('/collections', { params })
    return response.data.data
  }

  async getCollection(id: string) {
    const response = await this.client.get(`/collections/${id}`)
    return response.data.data
  }

  async createCollection(data: { listingId: string; data: any }) {
    const response = await this.client.post('/collections', data)
    return response.data.data
  }

  async updateCollection(id: string, data: { listingId?: string; data?: any }) {
    const response = await this.client.patch(`/collections/${id}`, data)
    return response.data.data
  }

  async deleteCollection(id: string) {
    const response = await this.client.delete(`/collections/${id}`)
    // 204 No Content responses don't have a body
    if (response.status === 204 || !response.data) {
      return { success: true }
    }
    return response.data.data || response.data
  }

  async deleteImage(imageUrl: string) {
    const response = await this.client.delete('/collections/image', { data: { imageUrl } })
    return response.data
  }

  // Inspections API methods
  async getInspectionUploadUrl(fileName: string, fileType: string) {
    const response = await this.client.post('/inspections/upload-url', { fileName, fileType })
    return response.data.data
  }

  async uploadInspectionImage(file: File): Promise<{ imageUrl: string; originalSize: number; optimizedSize: number; compressionRatio: string }> {
    const formData = new FormData()
    formData.append('image', file)
    
    // For FormData, delete Content-Type header so axios can set it automatically with boundary
    const response = await this.client.post('/inspections/upload-image', formData, {
      headers: {
        'Content-Type': undefined, // Remove default Content-Type so axios sets multipart/form-data with boundary
      },
    })
    
    return response.data.data
  }

  async listInspections(params?: { page?: number; limit?: number; authorId?: string }) {
    const response = await this.client.get('/inspections', { params })
    return response.data.data
  }

  async getInspection(id: string) {
    const response = await this.client.get(`/inspections/${id}`)
    return response.data.data
  }

  async createInspection(data: { title: string; images: string[]; description: any; customerName?: string; inspectorName?: string; inspectionId?: string; link?: string }) {
    const response = await this.client.post('/inspections', data)
    return response.data.data
  }

  async updateInspection(id: string, data: { title?: string; images?: string[]; description?: any; customerName?: string; inspectorName?: string; inspectionId?: string; link?: string }) {
    const response = await this.client.patch(`/inspections/${id}`, data)
    return response.data.data
  }

  async deleteInspection(id: string) {
    const response = await this.client.delete(`/inspections/${id}`)
    return response.data.data
  }

  async deleteInspectionImage(imageUrl: string) {
    const response = await this.client.delete('/inspections/image', { data: { imageUrl } })
    return response.data
  }

  // Car Records API methods
  async listCarRecords(params?: { page?: number; limit?: number; authorId?: string }) {
    const response = await this.client.get('/car-records', { params })
    return response.data.data
  }

  async getCarRecord(id: string) {
    const response = await this.client.get(`/car-records/${id}`)
    return response.data.data
  }

  async getLatestCarRecord() {
    const response = await this.client.get('/car-records/latest')
    return response.data.data
  }

  async searchCarRecordsByVinLastDigits(vinLastDigits: string) {
    const response = await this.client.get('/car-records/search', {
      params: { vinLastDigits }
    })
    return response.data.data
  }

  async createCarRecord(data: { vin: string; car_model: string; engine_cc: string; weight: string; manufacture_date: string; price: string; fuel_type?: string }) {
    const response = await this.client.post('/car-records', data)
    return response.data.data
  }

  async updateCarRecord(id: string, data: { vin?: string; car_model?: string; engine_cc?: string; weight?: string; manufacture_date?: string; price?: string; fuel_type?: string }) {
    const response = await this.client.patch(`/car-records/${id}`, data)
    return response.data.data
  }

  async deleteCarRecord(id: string) {
    const response = await this.client.delete(`/car-records/${id}`)
    return response.data.data
  }

  // Extract car data from image (via Next.js API proxy)
  async extractCarData(croppedFile: File) {
    const formData = new FormData()
    formData.append('file', croppedFile)

    // Use Next.js API route to avoid CORS issues
    const response = await axios.post(
      '/api/extract',
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    )
    return response.data
  }

  // Extract car data from text (via Next.js API proxy)
  async extractCarDataFromText(text: string) {
    // Use Next.js API route to avoid CORS issues
    const response = await axios.post(
      '/api/extract-text',
      { text },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      }
    )
    return response.data
  }

  // Companies API methods
  async getCompanyUploadUrl(fileName: string, fileType: string) {
    const response = await this.client.post('/companies/upload-url', { fileName, fileType })
    return response.data.data
  }

  async listCompanies(params?: { page?: number; limit?: number; authorId?: string }) {
    const response = await this.client.get('/companies', { params })
    return response.data.data
  }

  async getCompany(id: string) {
    const response = await this.client.get(`/companies/${id}`)
    return response.data.data
  }

  async createCompany(data: { name: string; address: string; phone: string; logoUrl?: string; sealUrl?: string }) {
    const response = await this.client.post('/companies', data)
    return response.data.data
  }

  async updateCompany(id: string, data: { name?: string; address?: string; phone?: string; logoUrl?: string; sealUrl?: string }) {
    const response = await this.client.patch(`/companies/${id}`, data)
    return response.data.data
  }

  async deleteCompany(id: string) {
    const response = await this.client.delete(`/companies/${id}`)
    return response.data.data
  }

  // Port Info API methods
  async listPortInfos(params?: { page?: number; limit?: number; authorId?: string }) {
    const response = await this.client.get('/port-infos', { params })
    return response.data.data
  }

  async getPortInfo(id: string) {
    const response = await this.client.get(`/port-infos/${id}`)
    return response.data.data
  }

  async createPortInfo(data: { shortAddress: string; description: string }) {
    const response = await this.client.post('/port-infos', data)
    return response.data.data
  }

  async updatePortInfo(id: string, data: { shortAddress?: string; description?: string }) {
    const response = await this.client.patch(`/port-infos/${id}`, data)
    return response.data.data
  }

  async deletePortInfo(id: string) {
    const response = await this.client.delete(`/port-infos/${id}`)
    return response.data.data
  }

  // Invoices API methods
  async listInvoices(params?: { page?: number; limit?: number; authorId?: string }) {
    const response = await this.client.get('/invoices', { params })
    return response.data.data
  }

  // Invoice templates
  async getInvoiceTemplateUploadUrl(fileName: string, fileType: string) {
    const response = await this.client.post('/invoice-templates/upload-url', { fileName, fileType })
    return response.data.data
  }

  async createInvoiceTemplate(data: { fileName: string; fileUrl: string; s3Key: string }) {
    const response = await this.client.post('/invoice-templates', data)
    return response.data.data
  }

  async listInvoiceTemplates() {
    const response = await this.client.get('/invoice-templates')
    return response.data.data
  }

  async deleteInvoiceTemplate(id: string) {
    const response = await this.client.delete(`/invoice-templates/${id}`)
    return response.data.data
  }

  async getInvoice(id: string) {
    const response = await this.client.get(`/invoices/${id}`)
    return response.data.data
  }

  async createInvoice(data: {
    companyId: string
    portInfoId: string
    country: string
    destination: string
    destinationCountry: string
    invoiceTemplateUrl: string
    carRecordId?: string
    mode: "fake" | "original"
    buyer: {
      country: string
      consignee_name: string
      consignee_address: string
      consignee_iin: string
      consignee_tel: string
    }
  }) {
    const response = await this.client.post('/invoices', data)
    return response.data.data
  }

  async deleteInvoice(id: string) {
    const response = await this.client.delete(`/invoices/${id}`)
    return response.data.data
  }

  // Generate consignee (via backend API)
  // Note: This call might take longer, so we use a custom timeout
  async generateConsignee(country: string) {
    const response = await this.client.post('/invoices/generate-consignee', { country }, {
      timeout: 35000, // 35 seconds (backend has 30s timeout, give it a bit more)
    })
    return response.data
  }

  // Generic methods for other API calls
  async get(url: string) {
    const response = await this.client.get(url)
    return response.data
  }

  async post(url: string, data?: any) {
    const response = await this.client.post(url, data)
    return response.data
  }

  async put(url: string, data?: any) {
    const response = await this.client.put(url, data)
    return response.data
  }

  async delete(url: string) {
    const response = await this.client.delete(url)
    return response.data
  }
}

export const apiClient = new ApiClient()
