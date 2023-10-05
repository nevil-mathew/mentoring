const common = require('@constants/common')
const httpStatusCode = require('@generics/http-status')
const sessionData = require('@db/sessions/queries')
const notificationTemplateData = require('@db/notification-template/query')
const sessionAttendeesData = require('@db/sessionAttendees/queries')
const sessionAttendeesHelper = require('./sessionAttendees')
const utils = require('@generics/utils')
const kafkaCommunication = require('@generics/kafka-communication')

const sessionQueries = require('../../database/queries/sessions')
const sessionAttendeesQueries = require('@database/queries/sessionAttendees')
const notificationTemplateQueries = require('@database/queries/notificationTemplate')
const mentorQueries = require('../../database/queries/mentorextension')
const menteeQueries = require('../../database/queries/userextension')

module.exports = class AdminHelper {
	/**
	 * userDelete
	 * @method
	 * @name userDelete
	 * @param {decodedToken} decodedToken - decoded token of admin.
	 * @param {userId} userId - UserId of the user that needs to be deleted
	 * @returns {JSON} - List of users
	 */

	static async userDelete(decodedToken, userId) {
		try {
			if (decodedToken.roles.some((role) => role.title !== common.ADMIN_ROLE)) {
				return common.failureResponse({
					message: 'UNAUTHORIZED_REQUEST',
					statusCode: httpStatusCode.unauthorized,
					responseCode: 'UNAUTHORIZED',
				})
			}
			let result = {}

			const mentor = await mentorQueries.getMentorExtension(userId)
			const isMentor = mentor !== null

			let removedUserDetails

			if (isMentor) {
				removedUserDetails = await mentorQueries.removeMentorDetails(userId)
				const removedSessionsDetail = await sessionQueries.removeAndReturnMentorSessions(userId)
				result.isAttendeesNotified = await this.unenrollAndNotifySessionAttendees(removedSessionsDetail)
			} else {
				removedUserDetails = await menteeQueries.removeMenteeDetails(userId)
			}

			result.areUserDetailsCleared = removedUserDetails > 0
			result.isUnenrolledFromSessions = await this.unenrollFromUpcomingSessions(userId)

			if (result.isUnenrolledFromSessions && result.areUserDetailsCleared) {
				return common.successResponse({
					statusCode: httpStatusCode.ok,
					message: 'USER_REMOVED_SUCCESSFULLY',
					result,
				})
			}
			return common.failureResponse({
				statusCode: httpStatusCode.bad_request,
				message: 'USER_NOT_REMOVED_SUCCESSFULLY',
				result,
			})
		} catch (error) {
			console.error('An error occurred in userDelete:', error)
			return error
		}
	}

	static async unenrollAndNotifySessionAttendees(removedSessionsDetail) {
		try {
			const templateData = await notificationTemplateQueries.findOneEmailTemplate(
				process.env.MENTOR_SESSION_DELETE_EMAIL_TEMPLATE
			)

			for (const session of removedSessionsDetail) {
				const sessionAttendees = await sessionAttendeesQueries.findAll({
					session_id: session.id,
				})

				const sessionAttendeesIds = sessionAttendees.map((attendee) => attendee.mentee_id)
				const attendeesAccounts = await sessionAttendeesHelper.getAllAccountsDetail(sessionAttendeesIds)

				sessionAttendees.forEach((attendee) => {
					for (const element of attendeesAccounts.result) {
						if (element.id == attendee.mentee_id) {
							attendee.attendeeEmail = element.email
							attendee.attendeeName = element.name
							break
						}
					}
				})

				const sendEmailPromises = sessionAttendees.map(async (attendee) => {
					const payload = {
						type: 'email',
						email: {
							to: attendee.attendeeEmail,
							subject: templateData.subject,
							body: utils.composeEmailBody(templateData.body, {
								name: attendee.attendeeName,
								sessionTitle: session.title,
							}),
						},
					}
					await kafkaCommunication.pushEmailToKafka(payload)
				})
				await Promise.all(sendEmailPromises)
			}
			const sessionIds = removedSessionsDetail.map((session) => session.id)
			const unenrollCount = await sessionAttendeesQueries.unEnrollAllAttendeesOfSessions(sessionIds)
			return true
		} catch (error) {
			console.error('An error occurred in notifySessionAttendees:', error)
			return error
		}
	}

	static async unenrollFromUpcomingSessions(userId) {
		try {
			const upcomingSessions = await sessionQueries.getAllUpcomingSessions(false)

			const upcomingSessionsId = upcomingSessions.map((session) => session.id)
			const usersUpcomingSessions = await sessionAttendeesQueries.usersUpcomingSessions(
				userId,
				upcomingSessionsId
			)
			if (usersUpcomingSessions.length === 0) {
				return true
			}
			await Promise.all(
				usersUpcomingSessions.map(async (session) => {
					await sessionQueries.updateEnrollmentCount(session.session_id, false)
				})
			)

			const unenrollFromUpcomingSessions = await sessionAttendeesQueries.unenrollFromUpcomingSessions(
				userId,
				upcomingSessionsId
			)
			return true
		} catch (error) {
			console.error('An error occurred in unenrollFromUpcomingSessions:', error)
			return error
		}
	}
}