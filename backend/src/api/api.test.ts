import request from 'supertest'
import app from '../app'

describe('GET /api/v1', () => {
	test('response with a json message', (done) => {
		request(app)
			.get('/api/v1')
			.set('Accept', 'application/json')
			.expect('Content-Type', /json/)
			.expect(
				200,
				{
					message: 'API v1 🍺',
				},
				done
			)
	})
})
