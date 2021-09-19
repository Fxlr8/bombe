const puppeteer = require('puppeteer');
console.log('Starting parse')
const fs = require('fs')
const tesseract = require("node-tesseract-ocr")

const tesseract_config = {
  lang: "rus",
  oem: 1, // LSTM neural nets
  psm: 6, // Assume a single uniform block of text.
}

const urls = [
    'http://www.primorsk.vybory.izbirkom.ru/region/izbirkom?action=show&root=252000008&tvd=4254005265112&vrn=100100067795849&prver=0&pronetvd=null&region=25&sub_region=25&type=242&report_mode=null',
    'http://www.primorsk.vybory.izbirkom.ru/region/izbirkom?action=show&root=252000008&tvd=4254005265113&vrn=100100067795849&prver=0&pronetvd=null&region=25&sub_region=25&type=242&report_mode=null'
]

const url = urls[0]

const runParse = async () => {
    const browser = await puppeteer.launch();

    const data = await getRawPageData(browser, url)
    fs.writeFileSync('src/output/test.json', JSON.stringify(data))

    const dataOCR = await doPageDataOCR(data)
    fs.writeFileSync('src/output/test_ocr.json', JSON.stringify(dataOCR))

    await browser.close();
}

const getRawPageData = async (browser, url) => {
    const page = await browser.newPage();
    await page.setViewport({ width: 2000, height: 768, deviceScaleFactor: 2 });
    await page.goto(url);    // Go website

    await page.waitForSelector(`.table-bordered > tbody:nth-child(1) > tr:nth-child(1) > td:nth-child(3)`)

    const titles = await page.$$eval(`.table-bordered > tbody:nth-child(1) > tr > td:nth-child(2)`, (e) => {
        return e.map((option) => option.textContent)
    })

    console.log(titles)

    const data = titles.map((t, i) => {
        return {
            id: i,
            title: t,
            value: undefined
        }
    })

    const tasks = data.map((d, i) => {
        return async () => {
            const selector = `.table-bordered > tbody:nth-child(1) > tr:nth-child(${i + 1}) > td:nth-child(3)`
            await page.waitForSelector(selector)
            const buffer = await screenshot(page, selector, i)
            data[i].value = buffer
        }
    })

    await tasks.reduce((p, task) => {
        return p.then(() => {
            return task()
        })
    }, Promise.resolve().then(r => r))

    await page.close();
    return data
}

const screenshot = async (page, selector, i) => {
    const valueField = await page.$(selector);

    const result = await valueField.screenshot({
        path: `src/output/test${i}.png`
    });

    return result
}

const doPageDataOCR = async(data) => {
    const tasks = data.map((d, i) => {
        return async () => {
            value = (await get_text_from_buffer(data[i].value)).trim();
            if (value.includes("\n")) {
                value = value.split(/\n/)
                data[i].value = value[0]
                data[i].percent = value[1]
            } else {
                data[i].value = value
            }
        }
    })

    await tasks.reduce((p, task) => {
        return p.then(() => {
            return task()
        })
    }, Promise.resolve().then(r => r))

    return data;
}

const get_text_from_buffer = async (buffer) => {
    return tesseract.recognize(buffer, tesseract_config);
}

runParse()

const run = async () => {

}

// console.log(res)

// const line = {
//     id: 1,
//     text: 'asd',
//     value: result
// }

// // console.log(line)
// // console.log('-------')
// const re = JSON.parse(JSON.stringify(line))
// // console.log(Buffer.from(re.value))


