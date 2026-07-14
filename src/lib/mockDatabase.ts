// Mock database implementation for browser environment
// This replaces the PostgreSQL client until a proper backend API is set up

interface QueryResult {
  rows: any[]
  rowCount: number
}

// Mock data storage using localStorage
class MockDatabase {
  private getTable(tableName: string): any[] {
    const data = localStorage.getItem(`mock_${tableName}`)
    return data ? JSON.parse(data) : []
  }

  private setTable(tableName: string, data: any[]): void {
    localStorage.setItem(`mock_${tableName}`, JSON.stringify(data))
  }

  private generateId(): string {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  async query(text: string, params: any[] = []): Promise<QueryResult> {
    console.log('Mock Database Query:', text, params)
    
    // Parse basic SQL operations
    const upperText = text.toUpperCase().trim()
    
    if (upperText.startsWith('SELECT')) {
      return this.handleSelect(text, params)
    } else if (upperText.startsWith('INSERT')) {
      return this.handleInsert(text, params)
    } else if (upperText.startsWith('UPDATE')) {
      return this.handleUpdate(text, params)
    } else if (upperText.startsWith('DELETE')) {
      return this.handleDelete(text, params)
    } else if (upperText.startsWith('CREATE TABLE')) {
      return this.handleCreateTable(text, params)
    }
    
    return { rows: [], rowCount: 0 }
  }

  private handleSelect(text: string, params: any[]): QueryResult {
    // Extract table name
    const tableMatch = text.match(/FROM\s+(\w+)/i)
    if (!tableMatch) return { rows: [], rowCount: 0 }
    
    const tableName = tableMatch[1]
    let data = this.getTable(tableName)
    
    // Handle WHERE conditions
    if (text.includes('WHERE')) {
      data = this.applyWhereConditions(data, text, params)
    }
    
    // Handle ORDER BY
    if (text.includes('ORDER BY')) {
      data = this.applyOrderBy(data, text)
    }
    
    // Handle LIMIT
    if (text.includes('LIMIT')) {
      const limitMatch = text.match(/LIMIT\s+(\d+)/i)
      if (limitMatch) {
        data = data.slice(0, parseInt(limitMatch[1]))
      }
    }
    
    return { rows: data, rowCount: data.length }
  }

  private handleInsert(text: string, params: any[]): QueryResult {
    const tableMatch = text.match(/INSERT INTO\s+(\w+)/i)
    if (!tableMatch) return { rows: [], rowCount: 0 }
    
    const tableName = tableMatch[1]
    const data = this.getTable(tableName)
    
    // Extract column names
    const columnsMatch = text.match(/\(([^)]+)\)/i)
    if (!columnsMatch) return { rows: [], rowCount: 0 }
    
    const columns = columnsMatch[1].split(',').map(col => col.trim())
    
    // Create new record
    const newRecord: any = { id: this.generateId() }
    columns.forEach((col, index) => {
      if (params[index] !== undefined) {
        newRecord[col] = params[index]
      }
    })
    
    // Add timestamps
    newRecord.created_at = new Date().toISOString()
    newRecord.updated_at = new Date().toISOString()
    
    data.push(newRecord)
    this.setTable(tableName, data)
    
    // Handle RETURNING clause
    if (text.includes('RETURNING')) {
      return { rows: [newRecord], rowCount: 1 }
    }
    
    return { rows: [], rowCount: 1 }
  }

  private handleUpdate(text: string, params: any[]): QueryResult {
    const tableMatch = text.match(/UPDATE\s+(\w+)/i)
    if (!tableMatch) return { rows: [], rowCount: 0 }
    
    const tableName = tableMatch[1]
    let data = this.getTable(tableName)
    
    // Apply WHERE conditions to find records to update
    const recordsToUpdate = this.applyWhereConditions(data, text, params.slice(-1)) // Last param is usually for WHERE
    
    // Update records
    let updatedCount = 0
    data = data.map(record => {
      if (recordsToUpdate.some(r => r.id === record.id)) {
        // Apply SET clause updates
        const setMatch = text.match(/SET\s+(.+?)\s+WHERE/i)
        if (setMatch) {
          const setPairs = setMatch[1].split(',')
          setPairs.forEach((pair, index) => {
            const [column] = pair.trim().split('=')
            if (params[index] !== undefined) {
              record[column.trim()] = params[index]
            }
          })
          record.updated_at = new Date().toISOString()
          updatedCount++
        }
      }
      return record
    })
    
    this.setTable(tableName, data)
    
    // Handle RETURNING clause
    if (text.includes('RETURNING')) {
      const updatedRecords = data.filter(record => 
        recordsToUpdate.some(r => r.id === record.id)
      )
      return { rows: updatedRecords, rowCount: updatedCount }
    }
    
    return { rows: [], rowCount: updatedCount }
  }

  private handleDelete(text: string, params: any[]): QueryResult {
    const tableMatch = text.match(/DELETE FROM\s+(\w+)/i)
    if (!tableMatch) return { rows: [], rowCount: 0 }
    
    const tableName = tableMatch[1]
    let data = this.getTable(tableName)
    
    // Apply WHERE conditions
    const recordsToDelete = this.applyWhereConditions(data, text, params)
    const deletedCount = recordsToDelete.length
    
    // Remove records
    data = data.filter(record => 
      !recordsToDelete.some(r => r.id === record.id)
    )
    
    this.setTable(tableName, data)
    return { rows: [], rowCount: deletedCount }
  }

  private handleCreateTable(text: string, params: any[]): QueryResult {
    // Just acknowledge table creation for mock purposes
    console.log('Mock: Table creation acknowledged')
    return { rows: [], rowCount: 0 }
  }

  private applyWhereConditions(data: any[], text: string, params: any[]): any[] {
    // Simple WHERE clause parsing
    const whereMatch = text.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i)
    if (!whereMatch) return data
    
    const whereClause = whereMatch[1]
    
    // Handle simple equality conditions
    if (whereClause.includes('=')) {
      const parts = whereClause.split('=')
      const column = parts[0].trim()
      const paramIndex = parts[1].trim().match(/\$(\d+)/)
      
      if (paramIndex && params[parseInt(paramIndex[1]) - 1] !== undefined) {
        const value = params[parseInt(paramIndex[1]) - 1]
        return data.filter(record => record[column] == value)
      }
    }
    
    return data
  }

  private applyOrderBy(data: any[], text: string): any[] {
    const orderMatch = text.match(/ORDER BY\s+(\w+)(?:\s+(ASC|DESC))?/i)
    if (!orderMatch) return data
    
    const column = orderMatch[1]
    const direction = orderMatch[2]?.toUpperCase() || 'ASC'
    
    return data.sort((a, b) => {
      const aVal = a[column]
      const bVal = b[column]
      
      if (direction === 'DESC') {
        return bVal > aVal ? 1 : -1
      } else {
        return aVal > bVal ? 1 : -1
      }
    })
  }

  // Initialize with some sample data
  initializeSampleData() {
    // Add sample users
    if (this.getTable('users').length === 0) {
      this.setTable('users', [
        {
          id: '1',
          email: 'admin@example.com',
          password: '$2a$10$example.hash', // This would be a real bcrypt hash
          name: 'Admin User',
          role: 'admin',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
    }
    
    // Add sample categories
    if (this.getTable('categories').length === 0) {
      this.setTable('categories', [
        {
          id: '1',
          name: '电子产品',
          description: '各种电子设备',
          is_active: true,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ])
    }
  }
}

export const mockDb = new MockDatabase()

// Initialize sample data
mockDb.initializeSampleData()

// Export the query function to match the real database interface
export const query = (text: string, params?: any[]) => mockDb.query(text, params || [])
export const transaction = async (callback: (client: any) => Promise<any>) => {
  // For mock purposes, just execute the callback
  return await callback({ query })
}