const { config, proxy } = require('internal')
const hls = require('./hls')

const defaults = {
	name: 'Fluxus Lust',
	prefix: 'fluxuslust_',
	icon: 'https://3.bp.blogspot.com/-iEXS5Rp0LUM/WZ4plyRMU6I/AAAAAAAAA5Q/c4exNnCRyAsZ3JNDCIv6PCDAs3NzDDy1gCLcBGAs/s320/FluxusLustH.png',
	paginate: 100
}

hls.init({ prefix: defaults.prefix, type: 'porn', config })

const types = [
	{
		name: 'Fluxus Lust',
		logo: 'https://3.bp.blogspot.com/-tW3kUrnyW18/WZ5nWLgXmTI/AAAAAAAAA6s/RUlGZ_jmWgQyZMALkvtBI5gk-BBteYiGQCPcBGAYYCw/s320/FluxuLustList.png',
		m3u: 'https://pastebin.com/raw/jMe87UHE'
	},
]

const catalogs = []

if (config.style == 'Catalogs')
	for (let i = 0; types[i]; i++)
		if (types[i].m3u)
			catalogs.push({
				name: types[i].name,
				id: defaults.prefix + 'cat_' + i,
				type: 'porn',
				extra: [ { name: 'search' }, { name: 'skip' } ]
			})

function atob(str) {
    return Buffer.from(str, 'base64').toString('binary');
}

const { addonBuilder, getInterface, getRouter } = require('stremio-addon-sdk')

if (!catalogs.length)
	catalogs.push({
		id: defaults.prefix + 'cat',
		name: defaults.name,
		type: 'porn',
		extra: [{ name: 'search' }]
	})

const metaTypes = ['porn']

if (config.style == 'Channels')
	metaTypes.push('channel')
else
	metaTypes.push('tv')

const builder = new addonBuilder({
	id: 'org.' + defaults.name.toLowerCase().replace(/[^a-z]+/g,''),
	version: '1.0.0',
	name: defaults.name,
	description: 'IPTV & VOD streams for Porn from Fluxus Lust. This content is intended for a mature audience.',
	resources: ['stream', 'meta', 'catalog'],
	types: metaTypes,
	idPrefixes: [defaults.prefix],
	icon: defaults.icon,
	catalogs
})

builder.defineCatalogHandler(args => {
	return new Promise((resolve, reject) => {
		const extra = args.extra || {}

		if (config.style == 'Channels') {

			const metas = []

			for (let i = 0; types[i]; i++)
				if (types[i].m3u)
					metas.push({
						name: types[i].name,
						id: defaults.prefix + i,
						type: 'channel',
						poster: types[i].logo,
						posterShape: 'landscape',
						background: types[i].logo,
						logo: types[i].logo
					})

			if (metas.length) {
				if (extra.search) {
					let results = []
					metas.forEach(meta => {
						if (meta.name && meta.name.toLowerCase().includes(extra.search.toLowerCase()))
							results.push(meta)
					})
					if (results.length)
						resolve({ metas: results })
					else
						reject(defaults.name + ' - No search results for: ' + extra.search)
				} else
					resolve({ metas })
			} else
				reject(defaults.name + ' - No M3U URLs set')

		} else if (config.style == 'Catalogs') {

			const skip = parseInt(extra.skip || 0)
			const id = args.id.replace(defaults.prefix + 'cat_', '')

			hls.getM3U((types[id] || {}).m3u, id).then(metas => {
				if (!metas.length)
					reject(defaults.name + ' - Could not get items from M3U playlist: ' + args.id)
				else {
					if (!extra.search)
						resolve({ metas: metas.slice(skip, skip + defaults.paginate).map(el => { el.type = 'tv'; return el }) })
					else {
						let results = []
						metas.forEach(meta => {
							if (meta.name && meta.name.toLowerCase().includes(extra.search.toLowerCase()))
								results.push(meta)
						})
						if (results.length)
							resolve({ metas: results.map(el => { el.type = 'tv'; return el }) })
						else
							reject(defaults.name + ' - No search results for: ' + extra.search)
					}
				}
			}).catch(err => {
				reject(err)
			})
		}
	})
})

builder.defineMetaHandler(args => {
	return new Promise((resolve, reject) => {
		if (config.style == 'Channels') {
			const i = args.id.replace(defaults.prefix, '')
			const meta = {
				name: types[i].name,
				id: defaults.prefix + i,
				type: 'channel',
				poster: types[i].logo,
				posterShape: 'landscape',
				background: types[i].logo,
				logo: types[i].logo
			}
			hls.getM3U(types[i].m3u).then(videos => {
				meta.videos = videos
				resolve({ meta })
			}).catch(err => {
				reject(err)
			})
		} else if (config.style == 'Catalogs') {
			const i = args.id.replace(defaults.prefix + 'url_', '').split('_')[0]
			hls.getM3U(types[i].m3u, i).then(metas => {
				let meta
				metas.some(el => {
					if (el.id == args.id) {
						meta = el
						return true
					}
				})
				if (meta)
					resolve({ meta })
				else
					reject(defaults.name + ' - Could not get meta item for: ' + args.id)
			}).catch(err => {
				reject(err)
			})
		} else
			console.log('err')
	})
})

builder.defineStreamHandler(args => {
	return new Promise(async (resolve, reject) => {
		if (config.style == 'Channels') {
			const url = decodeURIComponent(args.id.replace(defaults.prefix + 'url_', ''))
			const streams = await hls.processStream(proxy.addProxy(url))
			resolve({ streams: streams || [] })
		} else if (config.style == 'Catalogs') {
			const url = atob(decodeURIComponent(args.id.replace(defaults.prefix + 'url_', '').split('_')[1]))
			const streams = await hls.processStream(proxy.addProxy(url))
			resolve({ streams: streams || [] })
		}
	})
})

const addonInterface = getInterface(builder)

module.exports = getRouter(addonInterface)
