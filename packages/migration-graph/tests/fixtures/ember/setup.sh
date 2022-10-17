echo "Setup Fixtures";
parent_path=$( cd "$(dirname "${BASH_SOURCE[0]}")" ; pwd -P )
echo $parent_path;
echo "Setup fixture for ember-app";
cd $parent_path/app-template;
npm --version && npm install;
echo "Setup fixture for ember-addon";
cd $parent_path/addon-template;
npm --version && npm install;