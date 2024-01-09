const translate = require('google-translate-api');

export default async function handler(req, res) {
    let value = '';
    translate('Ik spreek Engels', {to: 'en'}).then(res => {
        console.log(res.text);
        //=> I speak English
        console.log(res.from.language.iso);
        value = res.text;
        res.status(200).json(res.text);
        //=> nl
    }).catch(err => {
        console.error(err);
    });
}