import { readdir, readFile, rm } from 'fs/promises'
import { join, extname } from 'path'
import { ChartData } from '../../src-shared/interfaces/search.interface.js'
import { NotesData } from 'scan-chart'
import { SngStream } from 'parse-sng'
import { Readable } from 'stream'
import { createReadStream } from 'fs'

interface BasicMetadata {
	name: string | null
	artist: string | null
	album: string | null
	charter: string | null
}

/**
 * Gets all songs from the library directory, including both folders and .sng files
 */
export async function getLibrarySongs(libraryPath: string): Promise<ChartData[]> {
	const songs: ChartData[] = []

	try {
		const files = await readdir(libraryPath, { withFileTypes: true })

		for (const file of files) {
			const fullPath = join(libraryPath, file.name)

			if (file.isDirectory()) {
				try {
					const songMetadata = await getSongMetadataFromDirectory(fullPath, file.name)
					if (songMetadata) {
						songs.push(createChartData(songMetadata, fullPath))
					}
				} catch (err) {
					console.error(`Error reading song directory ${file.name}:`, err)
				}
			} else if (extname(file.name).toLowerCase() === '.sng') {
				try {
					const songMetadata = await getSongMetadataFromSng(fullPath, file.name)
					if (songMetadata) {
						songs.push(createChartData(songMetadata, fullPath))
					}
				} catch (err) {
					console.error(`Error reading .sng file ${file.name}:`, err)
				}
			}
		}
	} catch (err) {
		console.error('Error reading library directory:', err)
	}

	return songs
}

async function getSongMetadataFromDirectory(songPath: string, defaultName: string): Promise<BasicMetadata | null> {
	try {
		const songIniPath = join(songPath, 'song.ini')
		const chartPath = join(songPath, 'notes.chart')

		try {
			const iniContent = await readFile(songIniPath, 'utf-8')
			return parseIniFile(iniContent, defaultName)
		} catch {
			try {
				const chartContent = await readFile(chartPath, 'utf-8')
				return parseChartFile(chartContent, defaultName)
			} catch {
				return {
					name: defaultName,
					artist: null,
					album: null,
					charter: null,
				}
			}
		}
	} catch (err) {
		console.error(`Error reading metadata from directory ${songPath}:`, err)
		return null
	}
}

async function getSongMetadataFromSng(sngPath: string, defaultName: string): Promise<BasicMetadata | null> {
	try {
		const fileStream = createReadStream(sngPath)
		// @ts-expect-error - Type mismatch between node and web streams is expected
		const sngStream = new SngStream(Readable.toWeb(fileStream), { generateSongIni: true })

		return new Promise((resolve, reject) => {
			let foundMetadata = false

			sngStream.on('file', async (fileName, fileStream, nextFile) => {
				if (fileName === 'song.ini' && !foundMetadata) {
					foundMetadata = true
					const chunks: Uint8Array[] = []

					// @ts-expect-error - Type mismatch between node and web streams is expected
					const nodeStream = Readable.fromWeb(fileStream)
					nodeStream.on('data', chunk => chunks.push(chunk))
					nodeStream.on('end', () => {
						const content = Buffer.concat(chunks).toString('utf-8')
						resolve(parseIniFile(content, defaultName))
					})
					nodeStream.on('error', reject)
				} else if (fileName === 'notes.chart' && !foundMetadata) {
					foundMetadata = true
					const chunks: Uint8Array[] = []

					// @ts-expect-error - Type mismatch between node and web streams is expected
					const nodeStream = Readable.fromWeb(fileStream)
					nodeStream.on('data', chunk => chunks.push(chunk))
					nodeStream.on('end', () => {
						const content = Buffer.concat(chunks).toString('utf-8')
						resolve(parseChartFile(content, defaultName))
					})
					nodeStream.on('error', reject)
				}

				if (nextFile && !foundMetadata) {
					nextFile()
				}
			})

			sngStream.on('error', err => {
				console.error(`Error reading .sng file ${sngPath}:`, err)
				reject(err)
			})

			// Handle case where no metadata files are found
			fileStream.on('end', () => {
				if (!foundMetadata) {
					resolve({
						name: defaultName,
						artist: null,
						album: null,
						charter: null,
					})
				}
			})

			sngStream.start()
		})
	} catch (err) {
		console.error(`Error reading metadata from .sng file ${sngPath}:`, err)
		return null
	}
}

function createChartData(metadata: BasicMetadata, songPath: string): ChartData {
	return {
		name: metadata.name,
		artist: metadata.artist,
		album: metadata.album,
		genre: null,
		year: null,
		chartName: null,
		chartGenre: null,
		chartAlbum: null,
		chartYear: null,
		chartId: Date.now(),
		songId: null,
		groupId: Date.now(),
		albumArtMd5: null,
		md5: '',
		chartHash: '',
		versionGroupId: Date.now(),
		charter: metadata.charter,
		song_length: null,
		diff_band: null,
		diff_guitar: null,
		diff_guitar_coop: null,
		diff_rhythm: null,
		diff_bass: null,
		diff_drums: null,
		diff_drums_real: null,
		diff_keys: null,
		diff_guitarghl: null,
		diff_guitar_coop_ghl: null,
		diff_rhythm_ghl: null,
		diff_bassghl: null,
		diff_vocals: null,
		preview_start_time: null,
		icon: null,
		loading_phrase: null,
		album_track: null,
		playlist_track: null,
		modchart: null,
		delay: null,
		chart_offset: null,
		hopo_frequency: null,
		eighthnote_hopo: null,
		multiplier_note: null,
		video_start_time: null,
		five_lane_drums: null,
		pro_drums: null,
		end_events: null,
		notesData: {} as NotesData,
		folderIssues: [],
		metadataIssues: [],
		hasVideoBackground: false,
		modifiedTime: new Date().toISOString(),
		applicationDriveId: '',
		applicationUsername: '',
		packName: null,
		parentFolderId: '',
		drivePath: songPath,
		driveFileId: null,
		driveFileName: null,
		driveChartIsPack: false,
		internalPath: '',
	}
}

function parseIniFile(content: string, defaultName: string): BasicMetadata {
	const metadata: BasicMetadata = {
		name: defaultName,
		artist: null,
		album: null,
		charter: null,
	}

	const lines = content.split('\n')

	for (const line of lines) {
		const [key, value] = line.split('=').map(s => s.trim())
		if (key && value) {
			const lowerKey = key.toLowerCase()
			if (lowerKey === 'name') metadata.name = value
			if (lowerKey === 'artist') metadata.artist = value
			if (lowerKey === 'album') metadata.album = value
			if (lowerKey === 'charter') metadata.charter = value
		}
	}

	return metadata
}

function parseChartFile(content: string, defaultName: string): BasicMetadata {
	const metadata: BasicMetadata = {
		name: defaultName,
		artist: null,
		album: null,
		charter: null,
	}

	const lines = content.split('\n')

	for (const line of lines) {
		const match = line.match(/\s*(\w+)\s*=\s*"([^"]*)"/)
		if (match) {
			const [, key, value] = match
			const lowerKey = key.toLowerCase()
			if (lowerKey === 'name') metadata.name = value
			if (lowerKey === 'artist') metadata.artist = value
			if (lowerKey === 'album') metadata.album = value
			if (lowerKey === 'charter') metadata.charter = value
		}
	}

	return metadata
}

/**
 * Deletes songs from the library
 */
export async function deleteLibrarySongs(paths: string[]): Promise<void> {
	for (const path of paths) {
		try {
			await rm(path, { recursive: true, force: true })
		} catch (err) {
			console.error(`Error deleting song at ${path}:`, err)
			throw err
		}
	}
}
