class SaveHtmlAsUnicode {
	apply (registerAction) {
		registerAction('beforeRequest', async ({resource, requestOptions}) => {
			if (resource && resource.filename && resource.filename.endsWith('.html')) {
				return {
					requestOptions: {
						...requestOptions,
						encoding: 'utf8'
					}
				};
			}

			return {requestOptions};
		});
	}
}

export default SaveHtmlAsUnicode;
