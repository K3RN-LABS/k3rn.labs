import { describe, it, expect } from 'vitest'
import { normalizeManagerName, getExpertImage } from '../experts'

describe('Expert Utilities', () => {
    describe('normalizeManagerName', () => {
        it('should capitalize a lowercase name', () => {
            expect(normalizeManagerName('axel')).toBe('Axel')
        })

        it('should convert uppercase to title case', () => {
            expect(normalizeManagerName('MAYA')).toBe('Maya')
        })

        it('should handle Zara -> Sky mapping', () => {
            expect(normalizeManagerName('zara')).toBe('Sky')
            expect(normalizeManagerName('ZARA')).toBe('Sky')
            expect(normalizeManagerName('Zara ')).toBe('Sky')
        })

        it('should trim whitespace', () => {
            expect(normalizeManagerName('  ELENA  ')).toBe('Elena')
        })

        it('should return empty string for empty input', () => {
            expect(normalizeManagerName('')).toBe('')
        })
    })

    describe('getExpertImage', () => {
        it('should return the correct webp path for normalized names', () => {
            expect(getExpertImage('AXEL')).toBe('/images/experts/Axel.webp')
            expect(getExpertImage('MAYA')).toBe('/images/experts/Maya.webp')
        })

        it('should return Sky path for Zara', () => {
            expect(getExpertImage('zara')).toBe('/images/experts/Sky.webp')
        })
    })
})
