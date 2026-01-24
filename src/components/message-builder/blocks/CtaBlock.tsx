

export const CtaBlock = ({ content }: { content: any }) => {
    return (
        <div style={{ textAlign: content.align as any, padding: '16px' }}>
            <a
                href={content.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                    backgroundColor: content.backgroundColor,
                    color: content.textColor,
                    padding: '12px 24px',
                    borderRadius: content.borderRadius,
                    textDecoration: 'none',
                    fontWeight: 500,
                    display: 'inline-block'
                }}
            >
                {content.text}
            </a>
        </div>
    );
};
