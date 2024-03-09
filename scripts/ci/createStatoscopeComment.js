module.exports = ({downloadLink}) => {
    const data = JSON.parse(fs.readFileSync('result.json', 'utf8'));
    data.downloadLink = downloadLink;

    return `**📦 Statoscope quick diff with main-branch:**

**⏱ Build time:** ${data.buildTime.diff.formatted}

**⚖️ Initial size:** ${data.initialSize.diff.formatted}

**🕵️ Validation errors:** ${data.validation.total}

Full Statoscope report could be found [here ↗️](${data.downloadLink})`;
};
